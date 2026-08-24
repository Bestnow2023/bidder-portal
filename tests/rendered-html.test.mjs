import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("keeps the bidder portal as the primary screen", async () => {
  const [page, operationsPage, settingsPage, chatPage, biddersPage, postsPage, contractsPage, disputesPage, creditsPage, billingPage, helpPage, supportPage, layout, portalApp, globals, packageJson, nextConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/operations/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/chat/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/bidders/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/posts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contracts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/disputes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/credits/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/billing/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/help/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PortalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<PortalApp \/>/);
  assert.match(operationsPage, /<PortalApp \/>/);
  assert.match(settingsPage, /<PortalApp \/>/);
  assert.match(chatPage, /<PortalApp \/>/);
  assert.match(biddersPage, /<PortalApp \/>/);
  assert.match(postsPage, /<PortalApp \/>/);
  assert.match(contractsPage, /<PortalApp \/>/);
  assert.match(disputesPage, /<PortalApp \/>/);
  assert.match(creditsPage, /<PortalApp \/>/);
  assert.match(billingPage, /<PortalApp \/>/);
  assert.match(helpPage, /<PortalApp \/>/);
  assert.match(supportPage, /<PortalApp \/>/);
  assert.match(nextConfig, /destination: "\/help"/);
  assert.match(layout, /Bidder Work Portal/);
  assert.match(layout, /favicon\.png/);
  assert.match(layout, /cryptomus: "d8702318"/);
  assert.match(portalApp, /digniware-logo-dark\.png/);
  assert.match(portalApp, /digniware-logo-light\.png/);
  assert.match(globals, /\.bid-profile-grid\s*\{[\s\S]*grid-template-columns: repeat\(auto-fill, minmax\(280px, 420px\)\);/);
  assert.match(globals, /\.bid-profile-card\s*\{/);
  assert.match(portalApp, /Email and password sign-in/);
  assert.match(portalApp, /PublicHomePage/);
  assert.match(portalApp, /Bidder Portal developed by Digniware LLC/);
  assert.match(portalApp, /digniware\.com/);
  assert.match(portalApp, /publicPortal/);
  assert.match(portalApp, /Public Posts/);
  assert.match(portalApp, /Password/);
  assert.match(portalApp, /Remember me for 5 days/);
  assert.match(portalApp, /Sign up/);
  assert.match(portalApp, /Requested role/);
  assert.match(portalApp, /Super Admin/);
  assert.match(portalApp, /Active client/);
  assert.match(portalApp, /Assigned client/);
  assert.match(portalApp, /Dashboard/);
  assert.match(portalApp, /Settings/);
  assert.match(portalApp, /Profile Settings/);
  assert.match(portalApp, /Profile image/);
  assert.match(portalApp, /profileImageDataUrl/);
  assert.match(portalApp, /resizeProfileImage/);
  assert.match(portalApp, /Security/);
  assert.match(portalApp, /Profile settings/);
  assert.match(portalApp, /User ID:/);
  assert.match(portalApp, /displayUserId/);
  assert.match(portalApp, /publicId/);
  assert.match(portalApp, /targetUserPublicId/);
  assert.match(portalApp, /No exact User ID match yet/);
  assert.match(portalApp, /Search people/);
  assert.match(portalApp, /Client Search/);
  assert.match(portalApp, /Search clients/);
  assert.match(portalApp, /Bidder Search/);
  assert.match(portalApp, /Posts/);
  assert.match(portalApp, /Contracts/);
  assert.match(portalApp, /Post Credit/);
  assert.match(portalApp, /postCreditCount/);
  assert.match(portalApp, /postCreditMoneyPrice/);
  assert.match(portalApp, /Convert to post credit/);
  assert.match(portalApp, /Post credits to add/);
  assert.match(portalApp, /Create Post/);
  assert.match(portalApp, /Publish post/);
  assert.match(portalApp, /Edit Bid Profile/);
  assert.match(portalApp, /Share with bidders/);
  assert.match(portalApp, /BidProfileDetailModal/);
  assert.match(portalApp, /First name/);
  assert.match(portalApp, /Last 4 SSN/);
  assert.match(portalApp, /Resume link/);
  assert.match(portalApp, /Veteran status/);
  assert.match(portalApp, /Start Contract/);
  assert.match(portalApp, /Contract Management/);
  assert.match(portalApp, /contractPaymentStyles/);
  assert.match(portalApp, /Payment style/);
  assert.match(portalApp, /Fixed budget/);
  assert.match(portalApp, /Hourly rate/);
  assert.match(portalApp, /Monthly salary/);
  assert.match(portalApp, /End date/);
  assert.match(portalApp, /contractPayTerms/);
  assert.match(portalApp, /contractTimelineLabel/);
  assert.match(portalApp, /Worked With/);
  assert.match(portalApp, /CollaborationSummaryList/);
  assert.match(portalApp, /Wallet Balance/);
  assert.match(portalApp, /Earnings Chart/);
  assert.match(portalApp, /BidderEarningsChart/);
  assert.match(portalApp, /Contract ID/);
  assert.match(portalApp, /ContractDetailModal/);
  assert.match(portalApp, /Contract Details/);
  assert.match(portalApp, /Edit Contract/);
  assert.match(portalApp, /Save contract/);
  assert.match(portalApp, /Next payday/);
  assert.match(portalApp, /Set Next Payday/);
  assert.match(portalApp, /Save next payday/);
  assert.match(portalApp, /DisputesView/);
  assert.match(portalApp, /DisputeDetailModal/);
  assert.match(portalApp, /Dispute Details/);
  assert.match(portalApp, /Connected client credit/);
  assert.match(portalApp, /Currently working/);
  assert.match(portalApp, /Message client/);
  assert.match(portalApp, /Allow clients and bidders to contact me directly/);
  assert.match(portalApp, /Search bidders/);
  assert.match(portalApp, /Work Summary/);
  assert.match(portalApp, /Bidder Settings/);
  assert.match(portalApp, /All Work Logs/);
  assert.match(portalApp, /Work Log History/);
  assert.match(portalApp, /Add Work Log/);
  assert.match(portalApp, /Client filter/);
  assert.match(portalApp, /Paid status/);
  assert.match(portalApp, /Select bidder/);
  assert.match(portalApp, /Date filter/);
  assert.match(portalApp, /Specific date/);
  assert.match(portalApp, /This week/);
  assert.match(portalApp, /Last week/);
  assert.match(portalApp, /Last 3 days/);
  assert.match(portalApp, /Last 7 days/);
  assert.match(portalApp, /Last 1 month/);
  assert.match(portalApp, /Yesterday/);
  assert.match(portalApp, /Custom range/);
  assert.match(portalApp, /Save daily log/);
  assert.match(portalApp, /Pending review/);
  assert.match(portalApp, /Request edit/);
  assert.match(portalApp, /Request Work Log Edit/);
  assert.match(portalApp, /Send edit request/);
  assert.match(portalApp, /Payment History/);
  assert.match(portalApp, /Payday Reminder/);
  assert.match(portalApp, /Upcoming Payments/);
  assert.match(portalApp, /Inbox/);
  assert.match(portalApp, /Monitored conversation/);
  assert.match(portalApp, /Related post/);
  assert.match(portalApp, /portal-nav/);
  assert.match(portalApp, /portalNavVisible/);
  assert.match(portalApp, /ChatContractCard/);
  assert.match(portalApp, /Accept contract/);
  assert.match(portalApp, /profilePanelOpen/);
  assert.match(portalApp, /chat-side-panel/);
  assert.match(portalApp, /messageTimeInZone/);
  assert.match(portalApp, /message-time/);
  assert.match(portalApp, /compact-text-message/);
  assert.doesNotMatch(portalApp, /message-author/);
  assert.match(portalApp, /Sent/);
  assert.match(portalApp, /Read/);
  assert.match(portalApp, /markChatConversationRead/);
  assert.match(portalApp, /Attach/);
  assert.match(portalApp, /aria-label="Actions"/);
  assert.match(portalApp, /createPortal/);
  assert.match(portalApp, /z-\[120\]/);
  assert.match(portalApp, /Save edit/);
  assert.match(portalApp, /Save changes/);
  assert.match(portalApp, /Save method changes/);
  assert.match(portalApp, /Forgot password/);
  assert.match(portalApp, /Send verification/);
  assert.match(portalApp, /Set password/);
  assert.match(portalApp, /Save email/);
  assert.match(portalApp, /Save password/);
  assert.match(portalApp, /Check your email/);
  assert.match(portalApp, /Email verified successfully/);
  assert.match(portalApp, /isEmailVerificationError/);
  assert.match(portalApp, /Continue to sign in/);
  assert.match(portalApp, /Frequency/);
  assert.match(portalApp, /Weekday/);
  assert.match(portalApp, /Save paid payment/);
  assert.match(portalApp, /Credit Management/);
  assert.match(portalApp, /Billing Management/);
  assert.match(portalApp, /Billing/);
  assert.match(portalApp, /Search credit users/);
  assert.match(portalApp, /CreditAdjustmentModal/);
  assert.match(portalApp, /Client Analytics/);
  assert.match(portalApp, /Performance Chart/);
  assert.match(portalApp, /Bidder Breakdown/);
  assert.match(portalApp, /Bid Profile Breakdown/);
  assert.match(portalApp, /ClientAnalyticsChart/);
  assert.match(portalApp, /Release Payment/);
  assert.match(portalApp, /Release payment/);
  assert.match(portalApp, /Payout coin/);
  assert.match(portalApp, /Move client credits into the bidder money-credit wallet/);
  assert.match(portalApp, /WithdrawalRequestModal/);
  assert.match(portalApp, /Request withdrawal/);
  assert.match(portalApp, /Tip/);
  assert.match(portalApp, /Escrow History/);
  assert.match(portalApp, /Credit Wallet/);
  assert.match(portalApp, /Create Cryptomus invoice/);
  assert.match(portalApp, /Money credit/);
  assert.match(portalApp, /Open invoice/);
  assert.match(portalApp, /Notification center/);
  assert.match(portalApp, /notification-menu-wrap/);
  assert.match(portalApp, /openNotification/);
  assert.match(portalApp, /onClose/);
  assert.match(portalApp, /clientScopedWorkLogs/);
  assert.match(portalApp, /Only work, contracts, and payments connected to your client account are counted/);
  assert.match(portalApp, /Pending Withdrawal Requests/);
  assert.match(portalApp, /Completed Billing History/);
  assert.match(portalApp, /Mark completed/);
  assert.match(portalApp, /Mark Payment Completed/);
  assert.match(portalApp, /Charge client credit/);
  assert.match(portalApp, /Charge credit/);
  assert.match(portalApp, /Search credit users/);
  assert.match(portalApp, /All user types/);
  assert.match(portalApp, /Clients only/);
  assert.match(portalApp, /Bidders only/);
  assert.match(portalApp, /Has money credit/);
  assert.match(portalApp, /Has post credit/);
  assert.match(portalApp, /credit users shown/);
  assert.match(portalApp, /Add Person/);
  assert.match(portalApp, /Add person/);
  assert.match(portalApp, /Role filter/);
  assert.match(portalApp, /Status filter/);
  assert.match(portalApp, /Clear filters/);
  assert.match(portalApp, /Mark email verified/);
  assert.match(portalApp, /Edit Payment/);
  assert.match(portalApp, /Edit User/);
  assert.match(portalApp, /Edit Bidder Settings/);
  assert.match(portalApp, /visaStatusOptions/);
  assert.match(portalApp, /Requires sponsorship/);
  assert.match(portalApp, /Remove/);
  assert.match(portalApp, /Delete/);
  assert.match(portalApp, /Post Moderation/);
  assert.match(portalApp, /PostTable/);
  assert.match(portalApp, /All authors/);
  assert.match(portalApp, /All post types/);
  assert.match(portalApp, /Bid rate range/);
  assert.match(portalApp, /Bonus rate range/);
  assert.match(portalApp, /Min review stars/);
  assert.match(portalApp, /Min hired count/);
  assert.match(portalApp, /Min client avg rate/);
  assert.match(portalApp, /Min bidder earnings/);
  assert.match(portalApp, /All timezones/);
  assert.match(portalApp, /No posts match these filters/);
  assert.match(portalApp, /Edit Post/);
  assert.match(portalApp, /Save post/);
  assert.match(portalApp, /Posts cost 1 post credit/);
  assert.match(portalApp, /1 credit per post/);
  assert.match(portalApp, /money credit can cover/);
  assert.match(portalApp, /Client posts are visible to bidders/);
  assert.match(portalApp, /Search contracts/);
  assert.match(portalApp, /All clients/);
  assert.match(portalApp, /All bidders/);
  assert.match(portalApp, /No contracts match these filters/);
  assert.match(portalApp, /Search disputes/);
  assert.match(portalApp, /No disputes match these filters/);
  assert.match(portalApp, /disputes shown/);
  assert.match(portalApp, /Delete chat/);
  assert.match(portalApp, /addDisputeUpdate/);
  assert.match(portalApp, /Add details or screenshots/);
  assert.match(portalApp, /Attach screenshots/);
  assert.match(portalApp, /Assigned Bid Profile/);
  assert.match(portalApp, /Help Center/);
  assert.match(portalApp, /How This Works/);
  assert.match(portalApp, /Client Guide/);
  assert.match(portalApp, /Bidder Guide/);
  assert.match(portalApp, /Contracts, Feedback, And Disputes/);
  assert.match(portalApp, /Support messages/);
  assert.match(portalApp, /Use Support Center for super admin help/);
  assert.match(portalApp, /fixed, hourly, per bid, per bid \+ bonus, or regular monthly/);
  assert.match(portalApp, /If post credit is empty, money credit can cover posts at \$0\.10 for 1 post credit/);
  assert.match(portalApp, /Support Center/);
  assert.match(portalApp, /addSupportMessage/);
  assert.match(portalApp, /supportMessages/);
  assert.match(portalApp, /supportContacts/);
  assert.doesNotMatch(portalApp, /Attach Bid Profiles|Remove from bidder|Select member|Contract Disputes|Past Contract History|Client Work History|data\.workLogs\.slice\(0, 5\)/);
  assert.doesNotMatch(globals, /\.contract-grid|\.contract-card\s*\{/);
  assert.doesNotMatch(portalApp, /Enable notifications|Notifications on|Admin time /);
  assert.doesNotMatch(portalApp, /Roles ready|Work logging|No Stripe|set payment rates/);
  assert.doesNotMatch(portalApp, /Visible Profiles|ProfileCardGrid/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(`${page}\n${layout}\n${portalApp}`, /codex-preview|Your site is taking shape/i);
});

test("declares the requested frontend records", async () => {
  const [portalApp, packageJson, vercelConfig, envExample, globals, appEntries] = await Promise.all([
    readFile(new URL("../app/PortalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.local.example", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readdir(new URL("../app/", import.meta.url), { recursive: true }),
  ]);

  for (const label of [
    "User Management",
    "Manage accounts, approval status, roles, passwords, and email verification.",
    "Settings",
    "Profile Settings",
    "Security",
    "Profile settings",
    "User ID:",
    "targetUserPublicId",
    "Save email",
    "Save password",
    "Bidder Portal developed by Digniware LLC",
    "Public Posts",
    "Client Search",
    "Bidder Search",
    "Posts",
    "Post Credit",
    "Create Post",
    "Edit Bid Profile",
    "Share with bidders",
    "Client bid profile for job bidding.",
    "Notify shared bidders about this profile update",
    "Optional EEO details",
    "Last 4 SSN",
    "Resume link",
    "LinkedIn",
    "Veteran status",
    "Disability",
    "Available Posts",
    "My Posts",
    "Contracts",
    "Disputes",
    "Start Contract",
    "Contract Management",
    "Contract ID",
    "Contract Details",
    "End Contract",
    "End Summary",
    "Edit Contract",
    "Save contract",
    "How did the work go?",
    "Keep contract active",
    "Next payday",
    "Set Next Payday",
    "Save next payday",
    "Specific criteria",
    "Dispute Details",
    "Money credit",
    "Post credit",
    "Dispute Resolution Center",
    "Open dispute",
    "Close post",
    "Search clients",
    "Search bidders",
    "Assigned client",
    "Bidder Settings",
    "Work Summary",
    "Add Work Log",
    "Work Log History",
    "Client filter",
    "Paid status",
    "Pending review",
    "Approve",
    "Request edit",
    "Request Work Log Edit",
    "Send edit request",
    "Payment Method",
    "Payment History",
    "Credit Management",
    "Billing Management",
    "Credit Adjustment",
    "Search credit users",
    "Client Credit Balances",
    "Bidder Credit Balances",
    "Save credit adjustment",
    "Billing",
    "Release Payment",
    "Release payment",
    "Move client credits into the bidder money-credit wallet",
    "Request withdrawal",
    "Payout coin",
    "Crypto type / network",
    "TRC20 - TRON",
    "BEP20 - BSC",
    "Wallet address",
    "Tip",
    "Credit Wallet",
    "Create Cryptomus invoice",
    "Notification center",
    "Pending Withdrawal Requests",
    "Completed Billing History",
    "Mark completed",
    "Charge client credit",
    "Credit amount",
    "Charge credit",
    "Add Person",
    "Add person",
    "Mark email verified",
    "Mark read",
    "Escrow History",
    "Save paid payment",
    "Edit Payment",
    "Edit User",
    "Edit Bidder Settings",
    "Remove",
    "Actions",
    "Payment link",
    "Inbox",
    "Monitored conversation",
    "Delete chat",
    "Help",
    "Help Center",
    "How This Works",
    "Client Guide",
    "Bidder Guide",
    "Support messages",
    "Support Center",
    "Post Moderation",
    "PostTable",
    "Edit Post",
    "Save post",
    "Add details or screenshots",
    "Assigned Bid Profile",
    "messageTimeInZone",
    "message-time",
    "compact-text-message",
    "Mark Payment Completed",
    "Accept contract",
    "Sent",
    "Read",
  ]) {
    assert.match(portalApp, new RegExp(label));
  }

  for (const action of [
    "refreshPortal",
    "requestPasswordReset",
    "resetPassword",
    "verifyEmail",
    "signIn",
    "createUser",
    "updateUser",
    "setUserPassword",
    "deleteUser",
    "requestEmailVerification",
    "signUp",
    "saveProfile",
    "updateOwnEmail",
    "updateOwnPassword",
    "createCreditDeposit",
    "addManualCredit",
    "createPost",
    "updatePost",
    "updatePostStatus",
    "deletePost",
    "createContract",
    "updateContract",
    "updateContractStatus",
    "updateContractPayday",
    "markNotificationsRead",
    "addSupportMessage",
    "markChatConversationRead",
    "releasePayment",
    "completePayment",
    "requestWithdrawal",
    "savePaymentMethod",
    "saveWorkLog",
    "deleteWorkLog",
    "reviewWorkLog",
    "addPayment",
    "editPayment",
    "deletePayment",
    "addChatMessage",
    "editChatMessage",
    "deleteChatMessage",
    "deleteChatConversation",
    "addDisputeUpdate",
  ]) {
    assert.match(portalApp, new RegExp(action));
  }

  const parsedPackage = JSON.parse(packageJson);
  assert.match(portalApp, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(portalApp, /NEXT_PUBLIC_PORTAL_MODE/);
  assert.match(portalApp, /\/api\/portal/);
  assert.match(portalApp, /filterWorkLogsByDate/);
  assert.match(portalApp, /workLogsForUser/);
  assert.match(portalApp, /paymentsForUser/);
  assert.match(portalApp, /dateRangeFromPreset/);
  assert.match(portalApp, /selectedUserId/);
  assert.match(portalApp, /isWorkLogPaid/);
  assert.match(portalApp, /const userPayments = paymentsForUser\(user, data\.payments\)/);
  assert.match(portalApp, /isWorkLogApproved/);
  assert.match(portalApp, /workLogReviewStatus/);
  assert.match(portalApp, /reviewStatus/);
  assert.match(portalApp, /reviewNote/);
  assert.match(portalApp, /portalNotifications/);
  assert.match(portalApp, /paymentStatusLabel/);
  assert.match(portalApp, /paymentStatusClass/);
  assert.match(portalApp, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.match(portalApp, /assignedAdminId/);
  assert.match(portalApp, /profileCompletedAt/);
  assert.match(portalApp, /clientStats/);
  assert.match(portalApp, /clientUsers/);
  assert.match(portalApp, /accountStatusOptions/);
  assert.match(portalApp, /Pending Review/);
  assert.match(portalApp, /Temporarily Restricted/);
  assert.match(portalApp, /Suspended/);
  assert.match(portalApp, /Closed/);
  assert.match(portalApp, /isActiveAccount/);
  assert.match(portalApp, /user\.role === "bidder" && isActiveAccount\(user\)/);
  assert.match(portalApp, /PortalPost/);
  assert.match(portalApp, /ContractRecord/);
  assert.match(portalApp, /supportConversationIdForUser/);
  assert.match(portalApp, /assignedBidderIds/);
  assert.match(portalApp, /profileModalOpen/);
  assert.match(portalApp, /contractNextPaymentDateDefault/);
  assert.match(portalApp, /contractHasReleasedPayment/);
  assert.match(portalApp, /ContractEndModal/);
  assert.match(portalApp, /endFeedback/);
  assert.match(portalApp, /endReason/);
  assert.match(portalApp, /paidBeforeEnding/);
  assert.match(portalApp, /ContractEditModal/);
  assert.match(portalApp, /canEditContract/);
  assert.match(portalApp, /canSetContractPayday/);
  assert.match(portalApp, /userCreditBalances/);
  assert.match(portalApp, /SuperAdminCreditManagementView/);
  assert.match(portalApp, /CreditAdjustmentModal/);
  assert.match(portalApp, /SuperAdminBillingManagementView/);
  assert.match(portalApp, /CreditBalanceTable/);
  assert.match(portalApp, /timeZoneOptions/);
  assert.match(portalApp, /client@portal\.local/);
  assert.match(portalApp, /EscrowTable/);
  assert.match(portalApp, /DepositList/);
  assert.match(portalApp, /DepositRecord/);
  assert.match(portalApp, /PortalNotification/);
  assert.match(portalApp, /payoutCurrencies/);
  assert.match(portalApp, /payoutNetworkOptions/);
  assert.match(portalApp, /depositNetworkOptions/);
  assert.match(portalApp, /cryptoNetworkLabel/);
  assert.match(portalApp, /payoutMethodLabel/);
  assert.match(portalApp, /estimateForUserInRange/);
  assert.match(portalApp, /portalNotifications/);
  assert.match(portalApp, /unreadPortalNotifications/);
  assert.match(portalApp, /creditBalanceForClient/);
  assert.match(portalApp, /creditsDepositedForClient/);
  assert.match(portalApp, /isSuperAdminRole/);
  assert.match(portalApp, /isClientRole/);
  assert.match(portalApp, /isWorkerUser/);
  assert.match(portalApp, /Notification/);
  assert.match(portalApp, /FileReader/);
  assert.match(portalApp, /authorTimeZone/);
  assert.match(portalApp, /chatContacts/);
  assert.match(portalApp, /recipientId/);
  assert.match(portalApp, /relatedPostId/);
  assert.match(portalApp, /relatedContractId/);
  assert.match(portalApp, /ChatContractCard/);
  assert.match(portalApp, /chat-side-panel/);
  assert.match(portalApp, /profilePanelOpen/);
  assert.match(portalApp, /timeZoneDisplay/);
  assert.match(portalApp, /messageTimeInZone/);
  assert.match(portalApp, /requestedPostId/);
  assert.match(portalApp, /conversation-list/);
  assert.match(portalApp, /conversation-list-header/);
  assert.match(portalApp, /chat-main-pane/);
  assert.match(portalApp, /conversation-entry/);
  assert.match(portalApp, /conversation-badge/);
  assert.match(portalApp, /readReceipts/);
  assert.match(portalApp, /readAt/);
  assert.match(portalApp, /markChatConversationRead/);
  assert.match(portalApp, /allowDirectMessages/);
  assert.match(portalApp, /requestedRecipientId/);
  assert.match(portalApp, /methodId/);
  assert.match(portalApp, /sessionToken/);
  assert.match(portalApp, /workLogId/);
  assert.match(portalApp, /ActionMenu/);
  assert.match(portalApp, /AccountMenu/);
  assert.match(portalApp, /account-menu/);
  assert.match(portalApp, /showAccountSettings/);
  assert.match(portalApp, /navViews/);
  assert.match(portalApp, /view !== "profile"/);
  assert.match(portalApp, /pendingApprovalCount/);
  assert.match(portalApp, /viewRoutes/);
  assert.match(portalApp, /routeViews/);
  assert.match(portalApp, /navigateToView/);
  assert.match(portalApp, /\["people", "contracts", "disputes", "posts", "credits", "billing", "chat", "help", "support"\]/);
  assert.match(portalApp, /UserCreateModal/);
  assert.match(portalApp, /PostEditModal/);
  assert.match(portalApp, /\/bidder-settings/);
  assert.match(portalApp, /\/payments/);
  assert.match(portalApp, /\/settings/);
  assert.match(portalApp, /\/profile/);
  assert.match(portalApp, /\/clients/);
  assert.match(portalApp, /\/bidders/);
  assert.match(portalApp, /\/posts/);
  assert.match(portalApp, /\/contracts/);
  assert.match(portalApp, /\/disputes/);
  assert.match(portalApp, /\/credits/);
  assert.match(portalApp, /\/billing/);
  assert.match(portalApp, /\/help/);
  assert.match(portalApp, /\/support/);
  assert.match(portalApp, /aria-haspopup="menu"/);
  assert.match(portalApp, /fixed z-\[120\]/);
  assert.match(portalApp, /portal-nav/);
  assert.match(portalApp, /notification-menu-wrap/);
  assert.match(portalApp, /manual-credit-box/);
  assert.match(portalApp, /hover:bg-white\/80/);
  assert.match(portalApp, /auth-logo/);
  assert.match(portalApp, /sidebar-logo/);
  assert.match(portalApp, /telegram-chat-title/);
  assert.match(portalApp, /composer-shell/);
  assert.match(portalApp, /chat-content/);
  assert.match(portalApp, /message-row/);
  assert.match(portalApp, /MemberAvatar/);
  assert.match(portalApp, /message-check/);
  assert.match(portalApp, /chat-title-button/);
  assert.match(portalApp, /attachment-image-button/);
  assert.match(portalApp, /image-preview-modal/);
  assert.match(portalApp, /RatingStars/);
  assert.match(globals, /\.member-avatar/);
  assert.match(globals, /\.profile-image-field/);
  assert.match(globals, /\.rating-stars/);
  assert.match(globals, /\.chat-panel\.panel/);
  assert.match(globals, /\.content\.chat-content/);
  assert.match(globals, /\.analytics-bars/);
  assert.match(globals, /\.dispute-update-row/);
  assert.match(portalApp, /verificationPendingEmail/);
  assert.match(portalApp, /verificationSuccessEmail/);
  assert.match(portalApp, /paymentFrequency/);
  assert.match(portalApp, /paymentWeekday/);
  assert.match(portalApp, /nextPaymentDateFromSchedule/);
  assert.match(portalApp, /modal-panel/);
  assert.match(portalApp, /Cancel/);
  assert.match(portalApp, /audio controls/);
  assert.match(portalApp, /img src/);
  assert.doesNotMatch(portalApp, /Group Chat|Bidder Group|group messages|Client time |Your time|Member time|Enable notifications|Notifications on|Admin time /);
  assert.doesNotMatch(portalApp, /Visible Profiles|ProfileCardGrid/);
  assert.match(envExample, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_PORTAL_MODE/);
  assert.match(envExample, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.equal(parsedPackage.dependencies.mongodb, undefined);
  assert.equal(parsedPackage.scripts.build, "next build");
  assert.equal(parsedPackage.scripts["db:generate"], undefined);
  assert.equal(JSON.parse(vercelConfig).framework, "nextjs");
  for (const routePage of [
    "operations/page.tsx",
    "dashboard/page.tsx",
    "settings/page.tsx",
    "profile/page.tsx",
    "clients/page.tsx",
    "bidders/page.tsx",
    "credits/page.tsx",
    "billing/page.tsx",
    "help/page.tsx",
    "support/page.tsx",
    "people/page.tsx",
    "bidder-settings/page.tsx",
    "work/page.tsx",
    "payments/page.tsx",
    "chat/page.tsx",
  ]) {
    assert.equal(appEntries.some((entry) => String(entry) === routePage), true);
  }
  assert.equal(appEntries.some((entry) => String(entry) === "api/portal/route.ts"), false);
  assert.doesNotMatch(`${portalApp}\n${packageJson}\n${envExample}`, /@neondatabase|drizzle|DATABASE_URL|MONGODB_URI|cloudflare:workers|env\.DB/);
});

test("does not keep starter preview files", async () => {
  const entries = await readdir(new URL("../app/", import.meta.url), {
    recursive: true,
  });

  assert.equal(entries.some((entry) => String(entry).includes("SkeletonPreview.tsx")), false);
  assert.equal(entries.some((entry) => String(entry).includes("preview.css")), false);
});
