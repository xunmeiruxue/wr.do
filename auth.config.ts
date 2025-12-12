import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// import Resend from "next-auth/providers/resend";

import { env } from "@/env.mjs";

const linuxDoProvider: any = {
  id: "linuxdo",
  name: "Linux Do",
  version: "2.0",
  type: "oauth",
  authorization: "https://connect.linux.do/oauth2/authorize",
  token: "https://connect.linux.do/oauth2/token",
  userinfo: "https://connect.linux.do/api/user",
  clientId: env.LinuxDo_CLIENT_ID,
  clientSecret: env.LinuxDo_CLIENT_SECRET,
  checks: ["state"],
  profile: (profile: any) => {
    console.log("profile", profile);
    return {
      id: profile.id.toString(),
      name: profile.username,
      image: profile.avatar_url,
      email: profile.email,
      active: profile.active ? 1 : 0,
      // username: profile.username,
      // trust_level: profile.trust_level,
      // silenced: profile.user.silenced,
      // email: profile.user.email,
    };
  },
};

// 通用 OAuth 2.0 / OIDC Provider (支持 Authentik 等第三方认证服务)
const genericOAuthProvider: any =
  env.AUTH_OAUTH_ID && env.AUTH_OAUTH_SECRET && env.AUTH_OAUTH_ISSUER
    ? {
      id: "oauth",
      name: env.AUTH_OAUTH_NAME || "OAuth",
      type: "oidc",
      clientId: env.AUTH_OAUTH_ID,
      clientSecret: env.AUTH_OAUTH_SECRET,
      issuer: env.AUTH_OAUTH_ISSUER,
      checks: ["pkce", "state"],
      profile(profile: any) {
        console.log("Generic OAuth profile", profile);
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.email,
          email: profile.email,
          image: profile.picture || profile.avatar_url,
        };
      },
    }
    : null;

export default {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    Github({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    }),
    // Resend({
    //   apiKey: env.RESEND_API_KEY,
    //   from: env.EMAIL_FROM || "wrdo <support@wr.do>",
    //   async sendVerificationRequest({ identifier: email, url, provider }) {
    //     try {
    //       const { error } = await resend.emails.send({
    //         from: provider.from || "no-reply@wr.do",
    //         to: [email],
    //         subject: "Verify your email address",
    //         html: getVerificationEmailHtml({ url, appName: siteConfig.name }),
    //       });

    //       if (error) {
    //         throw new Error(`Resend error: ${JSON.stringify(error)}`);
    //       }
    //     } catch (error) {
    //       console.error("Error sending verification email", error);
    //       throw new Error("Error sending verification email");
    //     }
    //   },
    // }),
    linuxDoProvider,
    ...(genericOAuthProvider ? [genericOAuthProvider] : []),
    Credentials({
      name: "Credentials",
      credentials: {
        name: { label: "name", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(
          process.env.AUTH_URL + "/api/auth/credentials",
          {
            method: "POST",
            body: JSON.stringify(credentials),
          },
        );
        if (res.ok) {
          return res.json();
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
