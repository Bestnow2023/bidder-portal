export type Role = "super_admin" | "client" | "admin" | "bidder" | "developer";
export type UserStatus = "pending" | "approved" | "paused";
export type PaymentStatus = "scheduled" | "processing" | "paid" | "failed";
export type WorkLogReviewStatus = "pending" | "approved" | "changes_requested";
export type PaymentFrequency = "" | "weekly" | "biweekly" | "monthly";
export type PaymentWeekday = "" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export type ContractStatus = "requested" | "active" | "rejected" | "ended";
export type PostStatus = "active" | "closed";
export type PostType = "client" | "bidder";
export type DisputeStatus = "open" | "reviewing" | "resolved" | "closed";

export type CreditBalances = {
  moneyCreditBalance: number;
  postCreditBalance: number;
  giftCreditBalance?: number;
  postingCreditBalance: number;
};

export type PortalUser = {
  id: string;
  publicId?: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  assignedAdminId?: string;
  profileTitle?: string;
  profileBio?: string;
  profileSkills?: string[];
  profileLocation?: string;
  profileTimeZone?: string;
  companyName?: string;
  country?: string;
  clientPreferences?: string[];
  profileLanguages?: string[];
  profileCompletedAt?: string;
  allowDirectMessages?: boolean;
  clientRating?: number;
  creditBalances?: CreditBalances;
  clientStats?: {
    assignedBidderCount: number;
    flaggedNoHires: boolean;
    moneyPaid: number;
    bidderRating: number;
    averageBidRate: number;
    averageBonusGiven: number;
    escrowTotal: number;
    escrowFeeTotal: number;
    escrowNetTotal: number;
  };
  bidderStats?: {
    totalApplied: number;
    totalInterviews: number;
    totalEarned: number;
  };
  ratePerApplication: number;
  bonusPerInterview: number;
  nextPaymentDate: string;
  paymentSchedule: string;
  paymentFrequency?: PaymentFrequency;
  paymentWeekday?: PaymentWeekday;
  passwordSet?: boolean;
  passwordUpdatedAt?: string;
  passwordResetSentAt?: string;
  emailVerifiedAt?: string;
  emailVerificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractRecord = {
  id: string;
  clientId: string;
  workerId: string;
  requestedByUserId: string;
  title: string;
  criteria: string;
  ratePerApplication: number;
  bonusPerInterview: number;
  paymentFrequency: PaymentFrequency;
  paymentWeekday: PaymentWeekday;
  nextPaymentDate: string;
  startDate: string;
  status: ContractStatus;
  sourcePostId?: string;
  acceptedAt?: string;
  acceptedByUserId?: string;
  rejectedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PortalPost = {
  id: string;
  authorId: string;
  type: PostType;
  title: string;
  criteria: string;
  budgetAmount: number;
  preferredRate: number;
  bonusPerInterview: number;
  paymentFrequency: PaymentFrequency;
  paymentWeekday: PaymentWeekday;
  status: PostStatus;
  postCreditUsed: number;
  giftCreditUsed?: number;
  moneyCreditUsed: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export type BidProfileRecord = {
  id: string;
  clientId: string;
  profileName: string;
  fullLegalName: string;
  contactEmail: string;
  phone: string;
  targetSalary: string;
  visaStatus: string;
  jobTitles: string[];
  assignedBidderIds?: string[];
  extraFields: { label: string; value: string }[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DisputeRecord = {
  id: string;
  clientId: string;
  targetUserId: string;
  contractId: string;
  paymentId: string;
  subject: string;
  body: string;
  status: DisputeStatus;
  resolution: string;
  updates?: DisputeUpdate[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
  closedAt: string;
};

export type DisputeUpdate = {
  id: string;
  userId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethod = {
  id: string;
  userId: string;
  method: string;
  currency?: string;
  network?: string;
  address: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkLog = {
  id: string;
  userId: string;
  workDate: string;
  sheetLink: string;
  appliedJobs: number;
  interviewsScheduled: number;
  notes: string;
  reviewStatus?: WorkLogReviewStatus;
  reviewNote?: string;
  reviewedByUserId?: string;
  reviewRequestedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  paymentType?: "client_release" | "withdrawal" | string;
  userId: string;
  clientId?: string;
  periodStart: string;
  periodEnd: string;
  scheduledDate: string;
  amount: number;
  baseAmount?: number;
  tipAmount?: number;
  creditAmountUsed?: number;
  status: PaymentStatus;
  paymentLink: string;
  memo: string;
  payoutOrderId?: string;
  payoutUuid?: string;
  payoutStatus?: string;
  payoutCurrency?: string;
  payoutNetwork?: string;
  payoutAddress?: string;
  payoutTxid?: string;
  payoutError?: string;
  completedAt?: string;
  completedByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DepositRecord = {
  id: string;
  clientId: string;
  provider: "cryptomus" | "manual";
  orderId: string;
  invoiceUuid: string;
  amount: number;
  feeAmount: number;
  creditAmount: number;
  currency: string;
  toCurrency: string;
  network: string;
  status: "pending" | "paid" | "failed";
  providerStatus: string;
  paymentUrl: string;
  paymentAmountUsd: number;
  merchantAmount: number;
  txid: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string;
};

export type PortalNotification = {
  id: string;
  recipientRole?: "super_admin" | "";
  recipientUserId?: string;
  type: "client_credit_paid" | "work_log_submitted" | "work_log_updated" | "work_log_approved" | "work_log_changes_requested" | string;
  title: string;
  body: string;
  clientId?: string;
  relatedDepositId?: string;
  relatedWorkLogId?: string;
  actorUserId?: string;
  amount?: number;
  creditAmount?: number;
  readAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EscrowRecord = {
  id: string;
  clientId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: "funded";
  receiptLink: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  recipientId?: string;
  conversationId?: string;
  channel?: "direct" | "support" | string;
  messageType?: "text" | "contract_created" | "contract_accepted" | string;
  authorName: string;
  authorRole: Role;
  body: string;
  attachments?: ChatAttachment[];
  relatedPostId?: string;
  relatedContractId?: string;
  authorTimeZone?: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  editedByUserId?: string;
  readAt?: string;
  readByUserId?: string;
  deletedAt?: string;
  deletedByUserId?: string;
};

export type PortalData = {
  currentUser: PortalUser;
  sessionToken?: string;
  users: PortalUser[];
  paymentMethods: PaymentMethod[];
  workLogs: WorkLog[];
  payments: PaymentRecord[];
  escrows: EscrowRecord[];
  deposits: DepositRecord[];
  contracts: ContractRecord[];
  posts: PortalPost[];
  bidProfiles: BidProfileRecord[];
  disputes: DisputeRecord[];
  notifications: PortalNotification[];
  chatContacts?: PortalUser[];
  chatMessages: ChatMessage[];
  supportContacts?: PortalUser[];
  supportMessages?: ChatMessage[];
};
