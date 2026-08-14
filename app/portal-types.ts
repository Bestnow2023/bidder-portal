export type Role = "admin" | "bidder" | "developer";
export type UserStatus = "pending" | "approved" | "paused";
export type PaymentStatus = "scheduled" | "paid";

export type PortalUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  ratePerApplication: number;
  bonusPerInterview: number;
  nextPaymentDate: string;
  paymentSchedule: string;
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
  periodStart: string;
  periodEnd: string;
  scheduledDate: string;
  amount: number;
  status: PaymentStatus;
  paymentLink: string;
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
  chatMessages: ChatMessage[];
};
