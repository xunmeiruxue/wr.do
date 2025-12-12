"use client";

import { useEffect, useState, useTransition } from "react";
import { User, UserEmail } from "@prisma/client";
import randomName from "@scaleway/random-name";
import {
  PanelLeftClose,
  PanelRightClose,
  PenLine,
  Search,
  Sparkles,
  SquarePlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR from "swr";

import { UserEmailList } from "@/lib/dto/email";
import { reservedAddressSuffix } from "@/lib/enums";
import { cn, fetcher, nFormatter } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

import { CopyButton } from "../shared/copy-button";
import { EmptyPlaceholder } from "../shared/empty-placeholder";
import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import { TimeAgoIntl } from "../shared/time-ago";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { SendEmailModal } from "./SendEmailModal";

interface EmailSidebarProps {
  user: User;
  onSelectEmail: (emailAddress: string | null, ownerId?: string) => void;
  selectedEmailAddress: string | null;
  className?: string;
  isCollapsed?: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isAdminModel: boolean;
  setAdminModel: (isAdminModel: boolean) => void;
}

export default function EmailSidebar({
  user,
  onSelectEmail,
  selectedEmailAddress,
  className,
  isCollapsed,
  setIsCollapsed,
  isAdminModel,
  setAdminModel,
}: EmailSidebarProps) {
  const { isMobile } = useMediaQuery();
  const t = useTranslations("Email");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [domainSuffix, setDomainSuffix] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  // 其他用户邮箱删除确认Modal
  const [showOtherUserConfirm, setShowOtherUserConfirm] = useState(false);
  const [otherUserEmailInfo, setOtherUserEmailInfo] = useState<{ user: string; email: string } | null>(null);

  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading, error, mutate } = useSWR<{
    list: UserEmailList[];
    total: number;
    totalInboxCount: number;
    totalUnreadCount: number;
  }>(
    `/api/email?page=${currentPage}&size=${pageSize}&search=${searchQuery}&all=${isAdminModel}&unread=${onlyUnread}`,
    fetcher,
    { dedupingInterval: 5000 },
  );

  const { data: emailDomains, isLoading: isLoadingDomains } = useSWR<
    { domain_name: string; min_email_length: number }[]
  >("/api/domain?feature=email", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  useEffect(() => {
    if (!domainSuffix && emailDomains && emailDomains.length > 0) {
      setDomainSuffix(emailDomains[0].domain_name);
    }
  }, [domainSuffix, emailDomains]);

  if (!selectedEmailAddress && data && data.list.length > 0) {
    onSelectEmail(data.list[0].emailAddress);
  }

  const userEmails = data?.list || [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleSubmitEmail = async (emailSuffix: string) => {
    const limit_len =
      emailDomains?.find((d) => d.domain_name === domainSuffix)
        ?.min_email_length ?? 1;
    if (!emailSuffix || emailSuffix.length < limit_len) {
      toast.error(t("Email address characters must be at least") + ` ${limit_len}`);
      return;
    }
    if (/[^a-zA-Z0-9_\-\.]/.test(emailSuffix)) {
      toast.error(t("Invalid email address"));
      return;
    }
    if (!domainSuffix) {
      toast.error(t("Domain suffix cannot be empty"));
      return;
    }
    // 移除前端保留地址检查，交给后端处理（后端会检查管理员权限）

    startTransition(async () => {
      if (isEdit) {
        const editEmailId = userEmails.find(
          (email) => email.emailAddress === selectedEmailAddress,
        )?.id;
        const res = await fetch(`/api/email/${editEmailId}`, {
          method: "PUT",
          body: JSON.stringify({
            emailAddress: `${emailSuffix}@${domainSuffix}`,
          }),
        });
        if (res.ok) {
          mutate();
          setShowEmailModal(false);
          toast.success(t("Email updated successfully"));
        } else {
          const errorText = await res.text();
          toast.error(t("Failed to update email"), {
            description: errorText,
          });
        }
        return;
      } else {
        try {
          const res = await fetch("/api/email", {
            method: "POST",
            body: JSON.stringify({
              emailAddress: `${emailSuffix}@${domainSuffix}`,
            }),
          });
          if (res.ok) {
            mutate();
            setShowEmailModal(false);
            toast.success(t("Email created successfully"));
          } else {
            const errorText = await res.text();
            toast.error(t("Failed to create email"), {
              description: errorText,
            });
          }
        } catch (error) {
          console.log("Error creating email:", error);
          toast.error(t("Error creating email"));
        }
      }
    });
  };

  const handleOpenEditEmail = async (email: UserEmail) => {
    onSelectEmail(email.emailAddress);
    setDomainSuffix(email.emailAddress.split("@")[1]);
    if (selectedEmailAddress === email.emailAddress) {
      setIsEdit(true);
      setShowEmailModal(true);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    startTransition(async () => {
      try {
        // 检查是否是已删除邮箱，管理员删除已删除邮箱时使用硬删除
        const targetEmail = userEmails.find((e) => e.id === id);
        const isHardDelete =
          targetEmail?.deletedAt && user.role === "ADMIN";

        const url = isHardDelete
          ? `/api/email/${id}?hard=true`
          : `/api/email/${id}`;

        const res = await fetch(url, {
          method: "DELETE",
        });
        if (res.ok) {
          mutate();
          setShowDeleteModal(false);
          setDeleteInput("");
          setEmailToDelete(null);
          toast.success(t("Email deleted successfully"));
        } else {
          const errorText = await res.text();
          toast.error(t("Failed to delete email"), {
            description: errorText,
          });
        }
      } catch (error) {
        console.log("Error deleting email:", error);
      }
    });
  };

  const confirmDelete = () => {
    if (!emailToDelete) return;

    const selectedEmail = userEmails.find(
      (email) => email.id === emailToDelete,
    );
    if (!selectedEmail) return;

    const expectedInput = `delete ${selectedEmail.emailAddress}`;
    if (deleteInput === expectedInput) {
      handleDeleteEmail(emailToDelete);
    } else {
      toast.error(t("Input does not match. Please type correctly."));
    }
  };

  // 确认删除其他用户邮箱
  const confirmOtherUserDelete = () => {
    setShowOtherUserConfirm(false);
    setOtherUserEmailInfo(null);
    //确认后，打开删除输入框
    if (emailToDelete) {
      setShowDeleteModal(true);
    }
  };

  return (
    <div
      className={cn(`flex h-full flex-col border-r transition-all`, className)}
    >
      {/* Header */}
      <div className="border-b p-2 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          {!isCollapsed && (
            <div className="flex w-full items-center gap-2">
              <Button
                className="size-8 lg:size-7"
                variant="outline"
                size="icon"
                onClick={async () => {
                  setIsRefreshing(true);
                  await mutate();
                  setIsRefreshing(false);
                }}
                disabled={isRefreshing}
              >
                <Icons.refreshCw
                  size={15}
                  className={
                    isRefreshing || isLoading
                      ? "animate-spin stroke-muted-foreground"
                      : "stroke-muted-foreground"
                  }
                />
              </Button>
              <div className="relative w-full grow">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("Search emails")}
                  className="h-[30px] w-full border p-1 pl-8 text-xs placeholder:text-xs"
                />
                <Search className="absolute left-2 top-2 size-4 text-gray-500" />
              </div>
            </div>
          )}
          <Button
            className={cn("px-1", !isCollapsed ? "size-7" : "size-8")}
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelRightClose size={16} className="stroke-muted-foreground" />
            ) : (
              <PanelLeftClose size={16} className="stroke-muted-foreground" />
            )}
          </Button>
        </div>

        <Button
          className={
            isCollapsed
              ? "mx-auto size-9 lg:size-8"
              : "flex h-8 w-full items-center justify-center gap-2"
          }
          variant="default"
          size="icon"
          onClick={() => {
            setIsEdit(false);
            setShowEmailModal(true);
          }}
        >
          <SquarePlus className="size-4" />
          {!isCollapsed && (
            <span className="text-xs">{t("Create New Email")}</span>
          )}
        </Button>

        {!isCollapsed && (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            {/* Address */}
            <div className="flex flex-col items-center gap-1 rounded-md bg-neutral-100 px-1 pb-1 pt-2 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700">
              <div className="flex items-center gap-1">
                <Icons.mail className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Email Address")}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {nFormatter(data ? data.total : 0)}
              </p>
            </div>

            {/* Inbox Emails */}
            <div className="flex flex-col items-center gap-1 rounded-md bg-neutral-100 px-1 pb-1 pt-2 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700">
              <div className="flex items-center gap-1">
                <Icons.inbox className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Inbox Emails")}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {nFormatter(data ? data.totalInboxCount : 0)}
              </p>
            </div>

            <div
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-1 rounded-md bg-neutral-100 px-1 pb-1 pt-2 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700",
                {
                  "bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700":
                    onlyUnread,
                },
                { "col-span-2": user.role !== "ADMIN" },
              )}
              onClick={() => {
                setOnlyUnread(!onlyUnread);
              }}
            >
              <div className="flex items-center gap-1">
                <Icons.mailOpen className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Unread Emails")}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {nFormatter(data ? data.totalUnreadCount : 0)}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Icons.listFilter className="absolute bottom-1 right-1 size-3" />
                  </TooltipTrigger>
                  <TooltipContent>{t("Filter unread emails")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Admin Mode */}
            {user.role === "ADMIN" && (
              <div
                onClick={() => setAdminModel(!isAdminModel)}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-md bg-neutral-100 px-1 pb-1 pt-2 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700",
                  {
                    "bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-gray-700":
                      isAdminModel,
                  },
                )}
              >
                <div className="flex items-center gap-1">
                  <Icons.lock className="size-3" />
                  <p className="line-clamp-1 text-start font-medium">
                    {t("Admin Mode")}
                  </p>
                </div>
                <Switch
                  className="scale-90"
                  checked={isAdminModel}
                  onCheckedChange={(v) => setAdminModel(v)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="scrollbar-hidden flex-1 overflow-y-scroll">
        {isLoading && (
          <div className="flex flex-col gap-1 px-1 pt-1">
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
          </div>
        )}
        {error && (
          <div className="flex flex-col gap-1 p-1">
            <Skeleton className="h-[50px] w-full rounded-lg" />
            <Skeleton className="h-[50px] w-full rounded-lg" />
            <Skeleton className="h-[50px] w-full rounded-lg" />
          </div>
        )}
        {!error && !isLoading && userEmails && userEmails.length === 0 && (
          <>
            {!isCollapsed ? (
              <div className="flex h-full items-center justify-center">
                <EmptyPlaceholder className="shadow-none">
                  <EmptyPlaceholder.Icon name="mailPlus" />
                  <EmptyPlaceholder.Title>
                    {t("No emails")}
                  </EmptyPlaceholder.Title>
                  <EmptyPlaceholder.Description>
                    You don&apos;t have any email yet. Start creating email.
                  </EmptyPlaceholder.Description>
                </EmptyPlaceholder>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-1 pt-1">
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
              </div>
            )}
          </>
        )}

        {userEmails.map((email) => (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email.emailAddress, email.userId)}
            className={cn(
              `border-gray-5 group m-1 cursor-pointer bg-neutral-50 p-2 transition-colors hover:bg-neutral-100 dark:border-zinc-700 dark:bg-neutral-800 dark:hover:bg-neutral-900`,
              selectedEmailAddress === email.emailAddress
                ? "bg-gray-100 dark:bg-neutral-900"
                : "",
              isCollapsed ? "flex items-center justify-center" : "",
              // 软删除邮箱的视觉标记
              email.deletedAt ? "border-2 border-dashed border-red-400 bg-red-50/50 dark:border-red-600 dark:bg-red-950/30" : "",
            )}
          >
            <div
              className={cn(
                "flex flex-col gap-1.5",
                isCollapsed
                  ? "size-10 items-center justify-center rounded-xl bg-neutral-400 text-center text-white dark:text-neutral-100"
                  : "",
                selectedEmailAddress === email.emailAddress && isCollapsed
                  ? "bg-neutral-600"
                  : "",
              )}
            >
              {/* 第一行：邮箱名 + Badge */}
              <div className="flex w-full items-center gap-2">
                <span className="flex-1 truncate text-sm font-bold text-neutral-500 dark:text-zinc-400" title={email.emailAddress}>
                  {isCollapsed
                    ? email.emailAddress.slice(0, 1).toLocaleUpperCase()
                    : email.emailAddress}
                </span>

                {/* 软删除标记 Badge */}
                {!isCollapsed && email.deletedAt && (
                  <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0.5">
                    已删除
                  </Badge>
                )}
              </div>

              {/* 第二行：操作按钮 */}
              {!isCollapsed && (
                <div className="flex items-center gap-1 shrink-0">
                  <SendEmailModal
                    emailAddress={selectedEmailAddress}
                    onSuccess={mutate}
                    triggerButton={
                      <Icons.send
                        className={cn(
                          "size-5 rounded border p-1 text-primary",
                          !isMobile
                            ? "hidden hover:bg-neutral-200 group-hover:inline"
                            : "",
                        )}
                      />
                    }
                  />
                  <PenLine
                    className={cn(
                      "size-5 rounded border p-1 text-primary",
                      !isMobile
                        ? "hidden hover:bg-neutral-200 group-hover:inline"
                        : "",
                    )}
                    onClick={() => handleOpenEditEmail(email)}
                  />
                  <Icons.trash
                    className={cn(
                      "size-5 rounded border p-1 text-primary",
                      !isMobile
                        ? "hidden hover:bg-neutral-200 group-hover:inline"
                        : "",
                      email.deletedAt ? "bg-red-100" : "",
                    )}
                    onClick={() => {
                      // 检查是否是其他用户的正常邮箱
                      const isOtherUserActiveEmail =
                        isAdminModel &&
                        !email.deletedAt &&
                        email.user &&
                        email.user !== user.email;

                      if (isOtherUserActiveEmail) {
                        // 先显示确认Modal
                        setOtherUserEmailInfo({
                          user: email.user || "",
                          email: email.emailAddress,
                        });
                        setEmailToDelete(email.id);
                        setShowOtherUserConfirm(true);
                      } else {
                        // 正常删除流程
                        if (!email.deletedAt || (email.deletedAt && user.role === "ADMIN")) {
                          setEmailToDelete(email.id);
                          setShowDeleteModal(true);
                        }
                      }
                    }}
                  />
                  <CopyButton
                    value={`${email.emailAddress}`}
                    className={cn(
                      "size-5 rounded border p-1",
                      "duration-250 transition-all hover:bg-neutral-200",
                    )}
                    title="Copy email address"
                  />
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1 text-nowrap">
                  {email.unreadCount > 0 && (
                    <Badge variant="default">{email.unreadCount}</Badge>
                  )}
                  {t("{email} recived", { email: email.count })}
                </div>
                <span className="line-clamp-1 hover:line-clamp-none">
                  {isAdminModel
                    ? `${email.user || email.email.slice(0, 5)} · `
                    : ""}
                  <TimeAgoIntl date={email.createdAt} />
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!isCollapsed && data && totalPages > 1 && (
        <PaginationWrapper
          className="m-0 scale-75"
          total={data.total}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          layout="center"
        />
      )}

      {/* 创建\编辑邮箱的 Modal */}
      {showEmailModal && (
        <Modal showModal={showEmailModal} setShowModal={setShowEmailModal}>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              {isEdit ? t("Edit email") : t("Create new email")}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailAddress = (e.target as any).emailAddress.value;
                handleSubmitEmail(emailAddress);
              }}
            >
              <div className="mb-4">
                <label
                  htmlFor="emailAddress"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t("Email Address")}
                </label>
                <div className="flex items-center justify-center">
                  <Input
                    id="emailAddress"
                    name="emailAddress"
                    type="text"
                    placeholder={t("Enter email prefix")}
                    className="w-full rounded-r-none"
                    required
                    defaultValue={
                      isEdit ? selectedEmailAddress?.split("@")[0] || "" : ""
                    }
                  />
                  {isLoadingDomains ? (
                    <Skeleton className="h-9 w-1/3 rounded-none border-x-0 shadow-inner" />
                  ) : (
                    <Select
                      onValueChange={(value: string) => {
                        setDomainSuffix(value);
                      }}
                      name="suffix"
                      defaultValue={domainSuffix || "wr.do"}
                      disabled={isEdit}
                    >
                      <SelectTrigger className="w-1/3 rounded-none border-x-0 shadow-inner">
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailDomains && emailDomains.length > 0 ? (
                          emailDomains.map((v) => (
                            <SelectItem
                              key={v.domain_name}
                              value={v.domain_name}
                            >
                              @{v.domain_name}
                            </SelectItem>
                          ))
                        ) : (
                          <Button className="w-full" variant="ghost">
                            {t("No domains configured")}
                          </Button>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    className="rounded-l-none"
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isEdit}
                    onClick={() => {
                      (
                        document.getElementById(
                          "emailAddress",
                        ) as HTMLInputElement
                      ).value = randomName("", ".");
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailModal(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" variant="default" disabled={isPending}>
                  {isEdit ? t("Update") : t("Create")}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* 删除邮箱的 Modal */}
      {showDeleteModal && (
        <Modal showModal={showDeleteModal} setShowModal={setShowDeleteModal}>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("Delete email")}</h2>
            <p className="mb-4 text-sm text-neutral-600">
              {t(
                "You are about to delete the following email, once deleted, it cannot be recovered",
              )}
              . {t("All emails in inbox will be deleted at the same time")}.{" "}
              {t("Are you sure you want to continue?")}
            </p>
            <p className="mb-4 text-sm text-neutral-600">
              {t("To confirm, please type")}{" "}
              <strong>
                delete{" "}
                {userEmails.find((e) => e.id === emailToDelete)?.emailAddress}
              </strong>
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={`please input`}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInput("");
                  setEmailToDelete(null);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={
                  isPending ||
                  deleteInput !==
                  `delete ${userEmails.find((e) => e.id === emailToDelete)
                    ?.emailAddress
                  }`
                }
              >
                {t("Confirm Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 其他用户邮箱删除确认 Modal */}
      {showOtherUserConfirm && otherUserEmailInfo && (
        <Modal showModal={showOtherUserConfirm} setShowModal={setShowOtherUserConfirm}>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-red-600">⚠️ 警告</h2>
            <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
              此邮箱正在被其他用户使用！
            </p>
            <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
              <p className="text-sm">
                <strong>用户:</strong> {otherUserEmailInfo.user}
              </p>
              <p className="text-sm">
                <strong>邮箱:</strong> {otherUserEmailInfo.email}
              </p>
            </div>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              删除后该用户将无法再使用此邮箱。确定要删除吗？
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOtherUserConfirm(false);
                  setOtherUserEmailInfo(null);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmOtherUserDelete}
              >
                确定删除
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
