import { NextRequest, NextResponse } from "next/server";

import {
  deleteUserEmail,
  getUserEmailById,
  hardDeleteUserEmail,
  updateUserEmail,
} from "@/lib/dto/email";
import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

// 查询单个 UserEmail
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = checkUserStatus(await getCurrentUser());
  if (user instanceof Response) return user;

  const { id } = params;

  try {
    const userEmail = await getUserEmailById(id);
    if (!userEmail) {
      return NextResponse.json(
        { error: "邮箱不存在或已被删除" },
        { status: 404 },
      );
    }
    return NextResponse.json(userEmail, { status: 200 });
  } catch (error) {
    console.error("Error fetching user email:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 },
    );
  }
}

// 更新 UserEmail 的 emailAddress
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = checkUserStatus(await getCurrentUser());
  if (user instanceof Response) return user;

  const { id } = params;
  const { emailAddress } = await req.json();

  if (!emailAddress) {
    return NextResponse.json("缺少邮箱地址参数", { status: 400 });
  }

  try {
    const userEmail = await updateUserEmail(id, emailAddress);
    return NextResponse.json(userEmail, { status: 200 });
  } catch (error) {
    console.error("Error updating user email:", error);
    if (error.message === "邮箱不存在或已被删除") {
      return NextResponse.json(error.message, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json("邮箱地址已存在", { status: 409 });
    }
    return NextResponse.json("服务器内部错误", { status: 500 });
  }
}

// 删除 UserEmail
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = checkUserStatus(await getCurrentUser());
  if (user instanceof Response) return user;

  const { id } = params;
  const { searchParams } = new URL(req.url);
  const hard = searchParams.get("hard") === "true"; // 是否硬删除

  try {
    // 检查邮箱是否存在并获取所有者信息
    const userEmail = await prisma.userEmail.findUnique({
      where: { id },
      select: { userId: true, deletedAt: true },
    });

    if (!userEmail) {
      return NextResponse.json("邮箱不存在", {
        status: 404,
      });
    }

    // 权限检查：只有邮箱所有者或管理员可以删除
    if (userEmail.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json("没有权限删除此邮箱", { status: 403 });
    }

    // 管理员可以硬删除任何状态的邮箱（包括已软删除的）
    if (hard && user.role === "ADMIN") {
      await hardDeleteUserEmail(id);
      return NextResponse.json({ message: "邮箱已永久删除" }, { status: 200 });
    } else {
      // 普通删除（软删除）
      // 如果已经是软删除状态，提示用户
      if (userEmail.deletedAt !== null) {
        return NextResponse.json("邮箱已被删除", { status: 400 });
      }
      await deleteUserEmail(id);
      return NextResponse.json({ message: "邮箱已删除" }, { status: 200 });
    }
  } catch (error) {
    console.error("Error deleting user email:", error);
    if (error.message === "邮箱不存在或已被删除") {
      return NextResponse.json(error.message, { status: 404 });
    }
    return NextResponse.json("服务器内部错误", { status: 500 });
  }
}
