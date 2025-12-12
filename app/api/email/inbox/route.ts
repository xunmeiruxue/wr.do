import { NextRequest, NextResponse } from "next/server";

import { deleteEmailsByIds, getEmailsByEmailAddress } from "@/lib/dto/email";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

// 通过 emailAddress 查询所有相关 ForwardEmail
export async function GET(req: NextRequest) {
  const user = checkUserStatus(await getCurrentUser());
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const emailAddress = searchParams.get("emailAddress");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("size") || "10", 10);

  if (!emailAddress) {
    return NextResponse.json(
      { error: "缺少邮箱地址参数" },
      { status: 400 },
    );
  }

  try {
    const emails = await getEmailsByEmailAddress(
      emailAddress,
      page,
      pageSize,
      user.id,
      user.role === "ADMIN",
    );
    return NextResponse.json(emails, { status: 200 });
  } catch (error) {
    console.error("Error fetching emails:", error);
    if (error.message === "邮箱地址不存在或已被删除") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "没有权限查看此邮箱") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { ids } = await req.json();
    if (!ids) {
      return Response.json("缺少邮件ID参数", { status: 400 });
    }

    await deleteEmailsByIds(ids);

    return Response.json("删除成功", { status: 200 });
  } catch (error) {
    console.error("[Error]", error);
    return Response.json(error.message || "服务器错误", { status: 500 });
  }
}
