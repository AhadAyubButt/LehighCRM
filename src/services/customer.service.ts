import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ICustomer } from 'src/interfaces/icustomer';
import { API } from 'aws-amplify';
@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  listCustomer: ICustomer[] = [];
  filterCustomerData: Subject<ICustomer[]> = new Subject<ICustomer[]>();
  constructor() { 
    this.listAllCustomers()
  }

  listAllCustomers() {
    // @ts-ignore
    API.get("LehighCRMApi", "/items").then((value) => {
    this.listCustomer = value.Items;
    this.filterCustomerData.next(this.listCustomer);    
    });
  }

  filterCustomers(filterString: string) {
    if (filterString) {
    filterString = filterString.trim();
    this.filterCustomerData.next(
    this.listCustomer.filter((value1) => {
    return (
    `${value1.CustomerData.firstName}`.startsWith(filterString) ||
    `${value1.CustomerData.customerID}`.startsWith(filterString) ||
    `${value1.CustomerData.lastName}`.startsWith(filterString) ||
    `${value1.CustomerData.firstName.toLowerCase()}`.startsWith(filterString) ||
    `${value1.CustomerData.lastName.toLowerCase()}`.startsWith(filterString) ||
    `${value1.CustomerData.firstName} ${value1.CustomerData.lastName}`.startsWith(filterString) ||
    `${value1.CustomerData.firstName.toLowerCase()} ${value1.CustomerData.lastName.toLowerCase()}`.startsWith(
    filterString
    ) ||
    `${value1.CustomerData.firstName.toLowerCase()} ${value1.CustomerData.lastName}`.startsWith(filterString) ||
    `${value1.CustomerData.firstName} ${value1.CustomerData.lastName.toLowerCase()}`.startsWith(filterString) ||
    `${value1.CustomerData.email}`.includes(filterString) ||
    `${value1.CustomerData.customerID}`.includes(filterString)
    );
    })
    );
    } else {
    return this.filterCustomerData.next(this.listCustomer);
    
    }
    
  }
}
