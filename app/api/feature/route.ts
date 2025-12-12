import { getMultipleConfigs } from "@/lib/dto/system-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await getMultipleConfigs([
      "enable_user_registration",
      "enable_subdomain_apply",
      "system_notification",
      "enable_github_oauth",
      "enable_google_oauth",
      "enable_liunxdo_oauth",
      "enable_generic_oauth",
      "enable_resend_email_login",
      "enable_email_password_login",
      "enable_email_registration_suffix_limit",
      "email_registration_suffix_limit_white_list",
    ]);

    // 自动检测通用 OAuth 是否已配置
    // 如果环境变量中配置了 AUTH_OAUTH_ID 和 AUTH_OAUTH_SECRET，则自动启用
    const hasOAuthConfig = !!(
      process.env.AUTH_OAUTH_ID &&
      process.env.AUTH_OAUTH_SECRET &&
      process.env.AUTH_OAUTH_ISSUER
    );

    // 优先使用数据库配置，如果数据库未配置则根据环境变量自动判断
    const isGenericOAuthEnabled = configs.enable_generic_oauth ?? hasOAuthConfig;

    return Response.json({
      google: configs.enable_google_oauth,
      github: configs.enable_github_oauth,
      linuxdo: configs.enable_liunxdo_oauth,
      oauth: isGenericOAuthEnabled,
      oauthName: process.env.AUTH_OAUTH_NAME || "OAuth",
      resend: configs.enable_resend_email_login,
      credentials: configs.enable_email_password_login,
      registration: configs.enable_user_registration,
      enableSuffixLimit: configs.enable_email_registration_suffix_limit,
      suffixWhiteList: configs.email_registration_suffix_limit_white_list,
    });
  } catch (error) {
    console.log("[Error]", error);
  }
}
