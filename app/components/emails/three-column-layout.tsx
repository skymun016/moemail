"use client"

import { useState } from "react"
import { EmailList } from "./email-list"
import { MessageListContainer } from "./message-list-container"
import { MessageView } from "./message-view"
import { SendDialog } from "./send-dialog"
import { cn } from "@/lib/utils"
import { useCopy } from "@/hooks/use-copy"
import { useSendPermission } from "@/hooks/use-send-permission"
import { Copy, Mail } from "lucide-react"

interface Email {
  id: string
  address: string
}

export function ThreeColumnLayout() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [selectedMessageType, setSelectedMessageType] = useState<'received' | 'sent'>('received')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { copyToClipboard } = useCopy()
  const { canSend: canSendEmails } = useSendPermission()

  const columnClass = "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-lg backdrop-blur-sm"
  const headerClass = "p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700"
  const titleClass = "text-base font-bold px-2 w-full overflow-hidden text-gray-800 dark:text-gray-200"

  // 移动端视图逻辑
  const getMobileView = () => {
    if (selectedMessageId) return "message"
    if (selectedEmail) return "emails"
    return "list"
  }

  const mobileView = getMobileView()

  const copyEmailAddress = () => {
    copyToClipboard(selectedEmail?.address || "")
  }

  const handleMessageSelect = (messageId: string | null, messageType: 'received' | 'sent' = 'received') => {
    setSelectedMessageId(messageId)
    setSelectedMessageType(messageType)
  }

  const handleSendSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="pb-6 pt-20 h-full flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 桌面端三栏布局 */}
      <div className="hidden lg:grid grid-cols-12 gap-6 h-full min-h-0 px-4">
        <div className={cn("col-span-4", columnClass)}>
          <div className="flex-1 overflow-auto">
            <EmailList
              onEmailSelect={(email) => {
                setSelectedEmail(email)
                setSelectedMessageId(null)
              }}
              selectedEmailId={selectedEmail?.id}
            />
          </div>
        </div>

        <div className={cn("col-span-3", columnClass)}>
          <div className={headerClass}>
            <div className="w-full">
              {selectedEmail ? (
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {selectedEmail.address}
                        </span>
                        <button
                          className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors duration-200"
                          onClick={copyEmailAddress}
                          title="复制邮箱地址"
                        >
                          <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        点击消息查看详情
                      </div>
                    </div>
                  </div>
                  {selectedEmail && canSendEmails && (
                    <div className="flex-shrink-0">
                      <SendDialog
                        emailId={selectedEmail.id}
                        fromAddress={selectedEmail.address}
                        onSendSuccess={handleSendSuccess}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">选择邮箱</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">从左侧选择一个邮箱查看消息</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {selectedEmail && (
            <div className="flex-1 overflow-auto">
              <MessageListContainer
                email={selectedEmail}
                onMessageSelect={handleMessageSelect}
                selectedMessageId={selectedMessageId}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}
        </div>

        <div className={cn("col-span-5", columnClass)}>
          <div className={headerClass}>
            <h2 className={titleClass}>
              {selectedMessageId ? "邮件内容" : "选择邮件查看详情"}
            </h2>
          </div>
          {selectedEmail && selectedMessageId && (
            <div className="flex-1 overflow-auto">
              <MessageView
                emailId={selectedEmail.id}
                messageId={selectedMessageId}
                messageType={selectedMessageType}
                onClose={() => setSelectedMessageId(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 移动端单栏布局 */}
      <div className="lg:hidden h-full min-h-0">
        <div className={cn("h-full", columnClass)}>
          {mobileView === "list" && (
            <>
              <div className={headerClass}>
                <h2 className={titleClass}>我的邮箱</h2>
              </div>
              <div className="flex-1 overflow-auto">
                <EmailList
                  onEmailSelect={(email) => {
                    setSelectedEmail(email)
                  }}
                  selectedEmailId={selectedEmail?.id}
                />
              </div>
            </>
          )}

          {mobileView === "emails" && selectedEmail && (
            <div className="h-full flex flex-col">
              <div className={cn(headerClass, "gap-2")}>
                <button
                  onClick={() => {
                    setSelectedEmail(null)
                  }}
                  className="text-sm text-primary shrink-0"
                >
                  ← 返回邮箱列表
                </button>
                <div className="flex-1 flex justify-between items-center gap-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate min-w-0 flex-1 text-right">{selectedEmail.address}</span>
                    <div className="shrink-0 cursor-pointer text-primary" onClick={copyEmailAddress}>
                      <Copy className="size-4" />
                    </div>
                  </div>
                  {canSendEmails && (
                    <SendDialog 
                      emailId={selectedEmail.id} 
                      fromAddress={selectedEmail.address}
                      onSendSuccess={handleSendSuccess}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <MessageListContainer
                  email={selectedEmail}
                  onMessageSelect={handleMessageSelect}
                  selectedMessageId={selectedMessageId}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          )}

          {mobileView === "message" && selectedEmail && selectedMessageId && (
            <div className="h-full flex flex-col">
              <div className={headerClass}>
                <button
                  onClick={() => setSelectedMessageId(null)}
                  className="text-sm text-primary"
                >
                  ← 返回消息列表
                </button>
                <span className="text-sm font-medium">邮件内容</span>
              </div>
              <div className="flex-1 overflow-auto">
                <MessageView
                  emailId={selectedEmail.id}
                  messageId={selectedMessageId}
                  messageType={selectedMessageType}
                  onClose={() => setSelectedMessageId(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 