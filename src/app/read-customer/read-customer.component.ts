import { Component, OnInit } from '@angular/core';
import { API, DataStore } from 'aws-amplify';
import { ICustomer, I_CustomerData } from '../../interfaces/icustomer';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/services/auth.service';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-read-customer',
  templateUrl: './read-customer.component.html',
  styleUrls: ['./read-customer.component.css']
})

export class ReadCustomerComponent implements OnInit {

  customerData!: ICustomer;
  customerID: string = '';
  phone: any;
  form!: FormGroup;
  submitted = false;
  loader = false;
  private delIndex?: number;
  private authAgentName: any;

  get addressData(): any {
    return this.form.get(["AddressData"]);
  }

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    if (this.router.getCurrentNavigation()?.extras!.state) {
      this.customerData = this.router.getCurrentNavigation()?.extras!.state!['data'];
      localStorage.setItem('customerData', JSON.stringify(this.customerData));
    } else {
      this.customerData = JSON.parse(localStorage.getItem('customerData')!);
    }
    
    this.form = this.fb.group({
      firstName: [this.customerData.CustomerData.firstName, Validators.required],
      lastName: [this.customerData.CustomerData.lastName],
      email: [this.customerData.CustomerData.email],
      phone: [this.customerData.CustomerData.phone],
      companyName: [this.customerData.CustomerData.companyName],
      AddressData: this.fb.array([
        this.fb.group({
          address1: [''],
          city: [''],
          state: ['PA'],
          postalCode: ['']
        })
      ]),
      clientType: [this.customerData.CustomerData.clientType, Validators.required],
      notes: [this.customerData.CustomerData.notes],
      customerID: [this.customerData.CustomerData.customerID],
      Agent: [this.customerData.CustomerData.Agent]
    });

    this.auth.getAgent().then((value) => {
      this.authAgentName = value;
    });
  }

  onKeypressEvent(event: any){
    var x = event.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    event.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
  }

  ngOnInit(): void {
    this.addressData.clear();
    this.customerData?.CustomerData.AddressData.forEach((v) => {
      const addressArr = this.form.controls["AddressData"] as FormArray;
        addressArr.push(this.fb.group({
          address1: [v.address1],
          city: [v.city],
          state: [v.state],
          postalCode: [v.postalCode]
          }))
    })

  }

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }
  get f1() {
    return this.form;
  }

  Cancel(){
    this.router.navigate(['home/listcustomer'])
  }

  updateCustomer(){
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    this.loader = true;
    API.put('LehighCRMApi', '/items/updateCustomer', {
      body: {
        PK: this.customerData.PK,
        SK: this.customerData.SK,
        CustomerData: {...this.form.getRawValue()}
      }
    }).then((v) => {
      if(v.message == 'item updated' ){
        this.router.navigateByUrl('/home', {skipLocationChange: true}).then(()=>{
          localStorage.removeItem('listCustomers')
          this.router.navigate(['home','listcustomer']);
            
        });
      }
    })
  }

  addNewAddress() {
    const ship = this.form.controls["AddressData"] as FormArray;
    ship.push(
      this.fb.group({
        address1: ['', Validators.required],
        city: ['', Validators.required],
        state: ['PA', Validators.required],
        postalCode: ['', Validators.required]
      })
    );
  }

  deleteNewAddress() {
    const ship = this.form.controls["AddressData"] as FormArray;
    ship.removeAt(this.delIndex!);
  }

  select_modal_del(i: number) {
    this.delIndex = i;
    let mod = new Modal("#staticBackdrop2");
    mod.show();
  }

  toJob() {
    let obj = {
      CustomerData: {
        ...this.form.getRawValue(),
        Agent: this.authAgentName.attributes?.name
      }
    }
    localStorage.setItem("jobCreation", JSON.stringify(obj));
    this.router.navigate(["home", "job"]);
  }

}
