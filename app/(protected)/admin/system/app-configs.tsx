"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import pkg from "package.json";
import { toast } from "sonner";
import useSWR from "swr";

import { siteConfig } from "@/config/site";
import { fetcher } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";
import VersionNotifier from "@/components/shared/version-notifier";

export default function AppConfigs({ }: {}) {
  const [isPending, startTransition] = useTransition();
  const [loginMethodCount, setLoginMethodCount] = useState(0);

  const {
    data: configs,
    isLoading,
    mutate,
  } = useSWR<Record<string, any>>("/api/admin/configs", fetcher);
  const [notification, setNotification] = useState("");
  const [catchAllEmails, setCatchAllEmails] = useState("");
  const [forwardEmailTargets, setForwardEmailTargets] = useState("");
  const [forwardEmailWhiteList, setForwardEmailWhiteList] = useState("");
  const [emailSuffix, setEmailSuffix] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgTemplate, setTgTemplate] = useState("");
  const [tgWhiteList, setTgWhiteList] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookMethod, setWebhookMethod] = useState("POST");
  const [webhookHeaders, setWebhookHeaders] = useState("");
  const [webhookTemplate, setWebhookTemplate] = useState("");
  const [webhookWhiteList, setWebhookWhiteList] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  const t = useTranslations("Setting");

  useEffect(() => {
    if (!isLoading && configs) {
      setNotification(configs?.system_notification);
      setCatchAllEmails(configs?.catch_all_emails);
      setEmailSuffix(configs?.email_registration_suffix_limit_white_list);
      setTgBotToken(configs?.tg_email_bot_token);
      setTgChatId(configs?.tg_email_chat_id);
      setTgTemplate(configs?.tg_email_template);
      setTgWhiteList(configs?.tg_email_target_white_list);
      setForwardEmailTargets(configs?.email_forward_targets);
      setForwardEmailWhiteList(configs?.email_forward_white_list);
      setWebhookUrl(configs?.webhook_url || "");
      setWebhookSecret(configs?.webhook_secret || "");
      setWebhookMethod(configs?.webhook_method || "POST");
      setWebhookHeaders(configs?.webhook_headers || "");
      setWebhookTemplate(configs?.webhook_template || "");
      setWebhookWhiteList(configs?.webhook_target_white_list || "");
      setWebhookEnabled(!!configs?.enable_webhook_push);
    }

    if (!isLoading) {
      let count = 0;
      if (configs?.enable_google_oauth) count++;
      if (configs?.enable_github_oauth) count++;
      if (configs?.enable_liunxdo_oauth) count++;
      // if (configs?.enable_resend_email_login) count++;
      if (configs?.enable_email_password_login) count++;
      setLoginMethodCount(count);
    }
  }, [configs, isLoading]);

  const handleChange = (value: any, key: string, type: string) => {
    startTransition(async () => {
      const res = await fetch("/api/admin/configs", {
        method: "POST",
        body: JSON.stringify({ key, value, type }),
      });
      if (res.ok) {
        toast.success("Saved");
        mutate();
      } else {
        toast.error("Failed to save", {
          description: await res.text(),
        });
      }
    });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <Card>
      <Collapsible className="group" defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <div className="text-lg font-bold">{t("App Configs")}</div>
          <Icons.chevronDown className="ml-auto size-4" />
          <Icons.settings className="ml-3 size-4 transition-all group-hover:scale-110" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("User Registration")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Allow users to sign up")}
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_user_registration}
                  onCheckedChange={(v) =>
                    handleChange(v, "enable_user_registration", "BOOLEAN")
                  }
                />
              )}
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="space-y-1 text-start leading-none">
                  <p className="font-medium">{t("Login Methods")}</p>

                  <p className="text-xs text-muted-foreground">
                    {t("Select the login methods that users can use to log in")}
                  </p>
                </div>

                <Icons.chevronDown className="ml-auto mr-2 size-4" />
                <Badge>{loginMethodCount}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3 rounded-md bg-neutral-100 p-3 dark:bg-neutral-800">
                {configs && (
                  <>
                    <div className="flex items-center justify-between gap-3 transition-all duration-100 hover:cursor-pointer hover:shadow-sm">
                      <p className="flex items-center gap-2 text-sm">
                        <Icons.pwdKey className="size-4" />
                        {t("Email Password")}
                      </p>
                      <Switch
                        defaultChecked={configs.enable_email_password_login}
                        onCheckedChange={(v) =>
                          handleChange(
                            v,
                            "enable_email_password_login",
                            "BOOLEAN",
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 transition-all duration-100 hover:cursor-pointer hover:shadow-sm">
                      <p className="flex items-center gap-2 text-sm">
                        <Icons.github className="size-4" /> GitHub OAuth
                      </p>
                      <Switch
                        defaultChecked={configs.enable_github_oauth}
                        onCheckedChange={(v) =>
                          handleChange(v, "enable_github_oauth", "BOOLEAN")
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 transition-all duration-100 hover:cursor-pointer hover:shadow-sm">
                      <p className="flex items-center gap-2 text-sm">
                        <Icons.google className="size-4" />
                        Google OAuth
                      </p>
                      <Switch
                        defaultChecked={configs.enable_google_oauth}
                        onCheckedChange={(v) =>
                          handleChange(v, "enable_google_oauth", "BOOLEAN")
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 transition-all duration-100 hover:cursor-pointer hover:shadow-sm">
                      <p className="flex items-center gap-2 text-sm">
                        <img
                          src="/_static/images/linuxdo.webp"
                          alt="linuxdo"
                          className="size-4"
                        />
                        LinuxDo OAuth
                      </p>
                      <Switch
                        defaultChecked={configs.enable_liunxdo_oauth}
                        onCheckedChange={(v) =>
                          handleChange(v, "enable_liunxdo_oauth", "BOOLEAN")
                        }
                      />
                    </div>
                    {/* <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm">
                        <Icons.resend className="size-4" />
                        {t("Resend Email")}
                      </p>
                      <Switch
                        defaultChecked={configs.enable_resend_email_login}
                        onCheckedChange={(v) =>
                          handleChange(
                            v,
                            "enable_resend_email_login",
                            "BOOLEAN",
                          )
                        }
                      />
                    </div> */}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between space-x-2">
                <div className="space-y-1 leading-none">
                  <p className="flex items-center gap-2 font-medium">
                    {t("Email Suffix Limit")}
                  </p>
                  <p className="text-start text-xs text-muted-foreground">
                    {t(
                      "Enable eamil suffix limit, only works for resend email login and email password login methods",
                    )}
                  </p>
                </div>
                {configs && (
                  <div
                    className="ml-auto flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {configs.enable_email_registration_suffix_limit &&
                      !configs.email_registration_suffix_limit_white_list && (
                        <Badge variant="yellow">
                          <Icons.warning className="mr-1 size-3" />{" "}
                          {t("Need to configure")}
                        </Badge>
                      )}
                    <Switch
                      defaultChecked={
                        configs.enable_email_registration_suffix_limit
                      }
                      onCheckedChange={(v) =>
                        handleChange(
                          v,
                          "enable_email_registration_suffix_limit",
                          "BOOLEAN",
                        )
                      }
                    />
                    <Icons.chevronDown className="size-4" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4 shadow-md">
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Email Suffix White List")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set email suffix white list, split by comma, such as: gmail-com,yahoo-com,hotmail-com",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="gmail.com,yahoo.com,hotmail.com"
                        rows={5}
                        value={emailSuffix}
                        disabled={
                          !configs.enable_email_registration_suffix_limit
                        }
                        onChange={(e) => setEmailSuffix(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          emailSuffix ===
                          configs.email_registration_suffix_limit_white_list
                        }
                        onClick={() =>
                          handleChange(
                            emailSuffix,
                            "email_registration_suffix_limit_white_list",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-col items-start justify-start gap-3">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("Notification")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Set system notification, this will be displayed in the header",
                  )}
                </p>
              </div>
              {configs && (
                <div className="flex w-full items-start gap-2">
                  <Textarea
                    className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                    placeholder="Support HTML format, such as <div class='text-red-500'>Info</div>"
                    rows={5}
                    // defaultValue={configs.system_notification}
                    value={notification}
                    onChange={(e) => setNotification(e.target.value)}
                  />
                  <Button
                    className="h-9 text-nowrap"
                    disabled={
                      isPending || notification === configs.system_notification
                    }
                    onClick={() =>
                      handleChange(
                        notification,
                        "system_notification",
                        "STRING",
                      )
                    }
                  >
                    {t("Save")}
                  </Button>
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-1 text-xs text-muted-foreground/90"
              style={{ fontFamily: "Bahamas Bold" }}
            >
              Powered by
              <Link
                href={siteConfig.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-2 hover:underline"
              >
                {siteConfig.name}
              </Link>
              <Link
                href={`${siteConfig.links.github}/releases/latest`}
                target="_blank"
                rel="noreferrer"
                className="font-thin underline-offset-2 hover:underline"
              >
                v{pkg.version}
              </Link>
              <VersionNotifier />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="group border-y">
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <div className="text-lg font-bold">{t("Email Configs")}</div>
          <Icons.chevronDown className="ml-auto size-4" />
          <Icons.mail className="ml-3 size-4 transition-all group-hover:scale-110" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="space-y-6">
            {/* Catch-All*/}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between space-x-2">
                <div className="space-y-1 leading-none">
                  <p className="flex items-center gap-2 font-medium">
                    Catch-All
                  </p>
                  <p className="text-start text-xs text-muted-foreground">
                    {t(
                      "Enable email catch-all, all user's email address which created on this platform will be redirected to the catch-all email address",
                    )}
                  </p>
                </div>
                {configs && (
                  <div
                    className="ml-auto flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {configs.enable_email_catch_all &&
                      !configs.catch_all_emails && (
                        <Badge variant="yellow">
                          <Icons.warning className="mr-1 size-3" />{" "}
                          {t("Need to configure")}
                        </Badge>
                      )}
                    <Switch
                      defaultChecked={configs.enable_email_catch_all}
                      onCheckedChange={(v) =>
                        handleChange(v, "enable_email_catch_all", "BOOLEAN")
                      }
                    />

                    <Icons.chevronDown className="size-4" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4 shadow-md">
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Email Forward White List")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set email forward white list, split by comma, such as: a-wrdo,b-wrdo",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="example1@wr.do,example2@wr.do"
                        rows={5}
                        value={forwardEmailWhiteList}
                        onChange={(e) =>
                          setForwardEmailWhiteList(e.target.value)
                        }
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          forwardEmailWhiteList ===
                          configs.email_forward_white_list
                        }
                        onClick={() =>
                          handleChange(
                            forwardEmailWhiteList,
                            "email_forward_white_list",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Catch-All Email Address")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set catch-all email address, split by comma if more than one, such as: 1@a-com,2@b-com, Only works when email catch all is enabled",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="example1@wr.do,example2@wr.do"
                        rows={5}
                        value={catchAllEmails}
                        disabled={!configs.enable_email_catch_all}
                        onChange={(e) => setCatchAllEmails(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          catchAllEmails === configs.catch_all_emails
                        }
                        onClick={() =>
                          handleChange(
                            catchAllEmails,
                            "catch_all_emails",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            {/* Forward Email to other email address */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between space-x-2">
                <div className="space-y-1 leading-none">
                  <p className="flex items-center gap-2 font-medium">
                    {t("Email Forwarding")}
                  </p>
                  <p className="text-start text-xs text-muted-foreground">
                    {t(
                      "If enabled, forward all received emails to other platform email addresses (Send with Resend or Brevo)",
                    )}
                  </p>
                </div>
                {configs && (
                  <div
                    className="ml-auto flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {configs.enable_email_forward &&
                      !configs.email_forward_targets && (
                        <Badge variant="yellow">
                          <Icons.warning className="mr-1 size-3" />{" "}
                          {t("Need to configure")}
                        </Badge>
                      )}
                    <Switch
                      defaultChecked={configs.enable_email_forward}
                      onCheckedChange={(v) =>
                        handleChange(v, "enable_email_forward", "BOOLEAN")
                      }
                    />
                    <Icons.chevronDown className="size-4" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4 shadow-md">
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Email Forward White List")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set email forward white list, split by comma, such as: a-wrdo,b-wrdo",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="example1@wr.do,example2@wr.do"
                        rows={5}
                        value={forwardEmailWhiteList}
                        onChange={(e) =>
                          setForwardEmailWhiteList(e.target.value)
                        }
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          forwardEmailWhiteList ===
                          configs.email_forward_white_list
                        }
                        onClick={() =>
                          handleChange(
                            forwardEmailWhiteList,
                            "email_forward_white_list",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("Forward Email Targets")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set forward email address targets, split by comma if more than one, such as: 1@a-com,2@b-com, Only works when email forwarding is enabled",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="example1@wr.do,example2@wr.do"
                        rows={5}
                        value={forwardEmailTargets}
                        disabled={!configs.enable_email_forward}
                        onChange={(e) => setForwardEmailTargets(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          forwardEmailTargets === configs.email_forward_targets
                        }
                        onClick={() =>
                          handleChange(
                            forwardEmailTargets,
                            "email_forward_targets",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Telegram */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between space-x-2">
                <div className="space-y-1 leading-none">
                  <p className="flex items-center gap-2 font-medium">
                    {t("Telegram Pusher")}
                  </p>
                  <p className="text-start text-xs text-muted-foreground">
                    {t("Push message to Telegram groups")}.{" "}
                    <Link
                      href="/docs/developer/telegram-bot"
                      className="text-blue-500"
                      target="_blank"
                    >
                      {t("How to configure Telegram bot")} ?
                    </Link>
                  </p>
                </div>
                {configs && (
                  <div
                    className="ml-auto flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {configs.enable_tg_email_push &&
                      (!configs.tg_email_bot_token ||
                        !configs.tg_email_chat_id) && (
                        <Badge variant="yellow">
                          <Icons.warning className="mr-1 size-3" />{" "}
                          {t("Need to configure")}
                        </Badge>
                      )}
                    <Switch
                      defaultChecked={configs.enable_tg_email_push}
                      onCheckedChange={(v) =>
                        handleChange(v, "enable_tg_email_push", "BOOLEAN")
                      }
                    />
                    <Icons.chevronDown className="size-4" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4 shadow-md">
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("Telegram Bot Token")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set Telegram bot token, Only works when Telegram pusher is enabled",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Input
                        className="bg-white dark:bg-neutral-700"
                        placeholder="Enter your Telegram bot token"
                        type="password"
                        value={tgBotToken}
                        disabled={!configs.enable_tg_email_push}
                        onChange={(e) => setTgBotToken(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || tgBotToken === configs.tg_email_bot_token
                        }
                        onClick={() =>
                          handleChange(
                            tgBotToken,
                            "tg_email_bot_token",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("Telegram Group ID")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set Telegram group ID, split by comma if more than one, such as: -10054275724,-10045343642",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder=""
                        rows={5}
                        value={tgChatId}
                        disabled={!configs.enable_tg_email_push}
                        onChange={(e) => setTgChatId(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || tgChatId === configs.tg_email_chat_id
                        }
                        onClick={() =>
                          handleChange(tgChatId, "tg_email_chat_id", "STRING")
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Telegram Message Template")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("Set Telegram email message template")}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="Support Markdown, such as: 📧 *New Email* *From:* {{from}} *Subject:* {{subject}} ```content {{text}}```"
                        rows={5}
                        value={tgTemplate}
                        disabled={!configs.enable_tg_email_push}
                        onChange={(e) => setTgTemplate(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || tgTemplate === configs.tg_email_template
                        }
                        onClick={() =>
                          handleChange(
                            tgTemplate,
                            "tg_email_template",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Telegram Push Email White List")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set Telegram push email white list, split by comma, if not set, will push all emails",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder=""
                        rows={5}
                        value={tgWhiteList}
                        disabled={!configs.enable_tg_email_push}
                        onChange={(e) => setTgWhiteList(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          tgWhiteList === configs.tg_email_target_white_list
                        }
                        onClick={() =>
                          handleChange(
                            tgWhiteList,
                            "tg_email_target_white_list",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Webhook */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between space-x-2">
                <div className="space-y-1 leading-none">
                  <p className="flex items-center gap-2 font-medium">
                    {t("Webhook Pusher")}
                  </p>
                  <p className="text-start text-xs text-muted-foreground">
                    {t("Push message to custom webhook endpoint")}
                  </p>
                </div>
                {configs && (
                  <div
                    className="ml-auto flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {configs.enable_webhook_push &&
                      !configs.webhook_url && (
                        <Badge variant="yellow">
                          <Icons.warning className="mr-1 size-3" />{" "}
                          {t("Need to configure")}
                        </Badge>
                      )}
                    <Switch
                      checked={webhookEnabled}
                      onCheckedChange={(v) => {
                        setWebhookEnabled(v);
                        handleChange(v, "enable_webhook_push", "BOOLEAN");
                      }}
                    />
                    <Icons.chevronDown className="size-4" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4 shadow-md">
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("Webhook URL")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set webhook URL, Only works when Webhook pusher is enabled",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Input
                        className="bg-white dark:bg-neutral-700"
                        placeholder="https://your-webhook-endpoint.com/api/email"
                        value={webhookUrl}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || webhookUrl === configs.webhook_url
                        }
                        onClick={() =>
                          handleChange(webhookUrl, "webhook_url", "STRING")
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("Webhook Secret")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set webhook signature secret (optional), will be used to sign the payload with HMAC-SHA256",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Input
                        className="bg-white dark:bg-neutral-700"
                        placeholder="Enter your webhook secret"
                        type="password"
                        value={webhookSecret}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || webhookSecret === configs.webhook_secret
                        }
                        onClick={() =>
                          handleChange(
                            webhookSecret,
                            "webhook_secret",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">{t("HTTP Method")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Set HTTP request method, POST or PUT")}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors dark:bg-neutral-700"
                        value={webhookMethod}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookMethod(e.target.value)}
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending || webhookMethod === configs.webhook_method
                        }
                        onClick={() =>
                          handleChange(
                            webhookMethod,
                            "webhook_method",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Custom HTTP Headers")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set custom HTTP headers in JSON format, such as: {\"Authorization\":\"Bearer xxx\"}",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white font-mono text-xs dark:bg-neutral-700"
                        placeholder='{"Authorization": "Bearer your-token"}'
                        rows={3}
                        value={webhookHeaders}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookHeaders(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          webhookHeaders === configs.webhook_headers
                        }
                        onClick={() =>
                          handleChange(
                            webhookHeaders,
                            "webhook_headers",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Webhook Payload Template")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set webhook payload template in JSON format (optional)",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white font-mono text-xs dark:bg-neutral-700"
                        placeholder='Leave empty to use default format, or customize JSON payload'
                        rows={5}
                        value={webhookTemplate}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookTemplate(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          webhookTemplate === configs.webhook_template
                        }
                        onClick={() =>
                          handleChange(
                            webhookTemplate,
                            "webhook_template",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start gap-3">
                  <div className="space-y-1 leading-none">
                    <p className="font-medium">
                      {t("Webhook Push Email White List")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Set webhook push email white list, split by comma, if not set, will push all emails",
                      )}
                    </p>
                  </div>
                  {configs && (
                    <div className="flex w-full items-start gap-2">
                      <Textarea
                        className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                        placeholder="example@wr.do,test@wr.do"
                        rows={3}
                        value={webhookWhiteList}
                        disabled={!webhookEnabled}
                        onChange={(e) => setWebhookWhiteList(e.target.value)}
                      />
                      <Button
                        className="h-9 text-nowrap"
                        disabled={
                          isPending ||
                          webhookWhiteList ===
                          configs.webhook_target_white_list
                        }
                        onClick={() =>
                          handleChange(
                            webhookWhiteList,
                            "webhook_target_white_list",
                            "STRING",
                          )
                        }
                      >
                        {t("Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="group">
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <div className="text-lg font-bold">{t("Subdomain Configs")}</div>
          <Icons.chevronDown className="ml-auto size-4" />
          <Icons.globeLock className="ml-3 size-4 transition-all group-hover:scale-110" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("Subdomain Apply Mode")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Enable subdomain apply mode, each submission requires administrator review",
                  )}
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_subdomain_apply}
                  onCheckedChange={(v) =>
                    handleChange(v, "enable_subdomain_apply", "BOOLEAN")
                  }
                />
              )}
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">
                  {t("Application Status Email Notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Send email notifications for subdomain application status updates; Notifies administrators when users submit applications and notifies users of approval results; Only available when subdomain application mode is enabled",
                  )}
                  . (Brevo)
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_subdomain_status_email_pusher}
                  onCheckedChange={(v) =>
                    handleChange(
                      v,
                      "enable_subdomain_status_email_pusher",
                      "BOOLEAN",
                    )
                  }
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
