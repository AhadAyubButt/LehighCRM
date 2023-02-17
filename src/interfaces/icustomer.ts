export interface ICustomer {
    CustomerData: I_CustomerData,
    IS_TOUCHED: string;
    PK: string;
    SK: string;
}

export interface I_CustomerData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName: string;
    AddressData: IAddressData[];
    clientType: string;
    notes: string;
    createDate: string;
    Agent: string;
    customerID: number;
}

interface IAddressData {
    address1: string;
    city: string;
    state: string;
    postalCode: string;
}
