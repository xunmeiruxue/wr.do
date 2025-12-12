import { NextRequest, NextResponse } from "next/server";

import { checkApiKey } from "@/lib/dto/api-key";
import { getEmailsByEmailAddress } from "@/lib/dto/email";

// 通过 emailAddress 查询所有相关 ForwardEmail
export async function GET(req: NextRequest) {
  const custom_api_key = req.headers.get("wrdo-api-key");
  if (!custom_api_key) {
    return Response.json("Unauthorized", {
      status: 401,
    });
  }

  // Check if the API key is valid
  const user = await checkApiKey(custom_api_key);
  if (!user?.id) {
    return Response.json(
      "无效的 API 密钥。您可以在 https://wr.do/dashboard/settings 获取 API 密钥。",
      { status: 401 },
    );
  }
  if (user.active === 0) {
    return Response.json("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    });
  }

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
      false, // v1 API 不支持管理员模式，只能查看自己的邮箱
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
