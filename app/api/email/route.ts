import { NextRequest, NextResponse } from "next/server";

import { createUserEmail, getAllUserEmails } from "@/lib/dto/email";
import { getPlanQuota } from "@/lib/dto/plan";
import { checkUserStatus } from "@/lib/dto/user";
import { reservedAddressSuffix } from "@/lib/enums";
import { getCurrentUser } from "@/lib/session";
import { restrictByTimeRange } from "@/lib/team";

// 查询所有 UserEmail 地址
export async function GET(req: NextRequest) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);
    const search = searchParams.get("search") || "";
    const all = searchParams.get("all") || "false";
    const unread = searchParams.get("unread") || "false";

    if (all === "true" && user.role === "ADMIN") {
    }

    const userEmails = await getAllUserEmails(
      user.id,
      page,
      size,
      search,
      user.role === "ADMIN" && all === "true",
      unread === "true",
    );
    return NextResponse.json(userEmails, { status: 200 });
  } catch (error) {
    console.error("Error fetching user emails:", error);
    return NextResponse.json("服务器内部错误", { status: 500 });
  }
}

// 创建新 UserEmail
export async function POST(req: NextRequest) {
  const user = checkUserStatus(await getCurrentUser());
  if (user instanceof Response) return user;

  const plan = await getPlanQuota(user.team);

  // check limit
  const limit = await restrictByTimeRange({
    model: "userEmail",
    userId: user.id,
    limit: plan.emEmailAddresses,
    rangeType: "month",
  });
  if (limit)
    return NextResponse.json(limit.statusText, { status: limit.status });

  const { emailAddress } = await req.json();

  if (!emailAddress) {
    return NextResponse.json("缺少邮箱地址参数", { status: 400 });
  }

  const prefix = emailAddress.split("@")[0];
  // 只有非管理员用户才检查保留地址
  if (user.role !== "ADMIN" && reservedAddressSuffix.includes(prefix)) {
    return NextResponse.json("此邮箱地址为系统保留，请选择其他地址", {
      status: 400,
    });
  }

  try {
    const userEmail = await createUserEmail(user.id, emailAddress);
    return NextResponse.json(userEmail, { status: 201 });
  } catch (error) {
    // console.log("Error creating user email:", error);
    if (error.message === "Invalid userId") {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }
    if (error.code === "P2002" || error.message === "邮箱地址已存在") {
      return NextResponse.json("邮箱地址已存在", {
        status: 409,
      });
    }
    if (error.code === "EMAIL_DELETED_BY_OTHER") {
      return NextResponse.json(error.message, {
        status: 409,
      });
    }

    return NextResponse.json("服务器内部错误", { status: 500 });
  }
}
