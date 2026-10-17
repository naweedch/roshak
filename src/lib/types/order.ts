/** ساختار نمایش سفارش برای مشتری و پنل مدیریت (قابل سریال‌سازی) */
import type {
  CancelReason,
  OrderEventType,
  OrderPaymentStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
  ShipmentStatus,
} from "@/generated/prisma/enums";

export interface OrderItemView {
  id: string;
  productSlug: string;
  productName: string;
  sku: string;
  colorName: string;
  sizeLabel: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  discountAmount: string;
}

export interface OrderEventView {
  id: string;
  type: OrderEventType;
  toStatus: OrderStatus | null;
  message: string | null;
  createdAt: string;
  actorEmail?: string | null;
  isPublic: boolean;
}

export interface ShipmentView {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currency: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  taxRate: string;
  pricesIncludeTax: boolean;
  grandTotal: string;
  refundedTotal: string;
  discountCode: string | null;
  customerName: string;
  email: string;
  phone: string;
  shippingMethodName: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
  };
  customerNote: string | null;
  placedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: CancelReason | null;
  reservationExpiresAt: string | null;
  items: OrderItemView[];
  events: OrderEventView[];
  shipments: ShipmentView[];
  /** آیا مشتری می‌تواند دوباره برای پرداخت اقدام کند؟ */
  canRetryPayment: boolean;
  /** آیا مشتری می‌تواند سفارش پرداخت‌نشده را لغو کند؟ */
  canCancel: boolean;
}

export interface OrderSummaryView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currency: string;
  grandTotal: string;
  itemCount: number;
  placedAt: string;
  firstItemImage: string | null;
}

export interface AdminPaymentView {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  cardPanMasked: string | null;
  failureReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface AdminRefundView {
  id: string;
  amount: string;
  currency: string;
  reason: string;
  method: string | null;
  reference: string | null;
  status: RefundStatus;
  restocked: boolean;
  createdByEmail: string | null;
  createdAt: string;
}
