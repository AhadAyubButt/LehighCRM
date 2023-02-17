interface IJobData {
    subTotal: number;
    total: number;
    JobInfo: IJobInfo;
    ProductPayment: IProductPayment[];
    Description: string;
    leadName: string;
    CreateDate: string;
    totalAmount: number;
    invoiceID: string;
    paymentStatus: string;
    paymentType:string;
    markUp: number;
    discount: number;
    labourCost: number;
    checkForm: boolean;
    attachment: string;
    discountType: boolean;
    JobID: number;
    InvoiceID: string;
    paymentStatusType: string;
    jobAddress: string;
    jobPhone: string;
    lineItemNotes: string;
    paymentFirstName: string;
    paymentLastName: string;
    paymentEmail: string;
    paymentChequeAmount: string;
    paymentChequeNumber: string;
    paymentTransactionID: string;
    paymentInvoiceID: string;
    paymentAmount: string;
    paymentAmountLeft: string;
}

interface IJobInfo {
    company: string;
    salesType: string;
    technician: string;
    primaryAgent: string;
    secondaryAgent: string;
    jobDate: string;
}

interface IProductPayment {
    lineItem: string;
    quantity: number;
    rate: number;
}

export interface IJob {
    DisableFlag: boolean;
    JobData: IJobData;
    PK: string;
    SK: string;
    ArchiveFlag: boolean;
    customerID: string;
}