export type Role = "super_admin" | "client" | "admin" | "bidder" | "developer";
export type UserStatus = "pending" | "approved" | "paused";
export type PaymentStatus = "scheduled" | "processing" | "paid" | "failed";
export type PaymentFrequency = "" | "weekly" | "biweekly" | "monthly";
export type PaymentWeekday = "" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type PortalUser = {
  id: string;
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
  profileCompletedAt?: string;
  allowDirectMessages?: boolean;
  clientRating?: number;
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
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
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
  recipientRole: "super_admin";
  type: "client_credit_paid";
  title: string;
  body: string;
  clientId: string;
  relatedDepositId: string;
  amount: number;
  creditAmount: number;
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
  authorName: string;
  authorRole: Role;
  body: string;
  attachments?: ChatAttachment[];
  authorTimeZone?: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  editedByUserId?: string;
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
  notifications: PortalNotification[];
  chatContacts?: PortalUser[];
  chatMessages: ChatMessage[];
};
