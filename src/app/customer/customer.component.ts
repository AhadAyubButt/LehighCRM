import { Component, OnInit, Directive, HostListener, Input } from '@angular/core';
import { API, DataStore } from 'aws-amplify';
import { ICustomer } from '../../interfaces/icustomer';
import { NavigationExtras, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/services/auth.service';
import { fromEvent } from 'rxjs';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent implements OnInit {
  form: FormGroup;
  customerData!: ICustomer;
  private authAgentName: any;
  loader = false;
  submitted = false;
  phone: any;
  isButtonVisible = false;
  private delIndex?: number;

  get addressData(): any {
    return this.form.get(["AddressData"]);
  }

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: [''],
      email: [''],
      phone: [''],
      companyName: [''],
      AddressData: this.fb.array([
        this.fb.group({
          address1: [''],
          city: [''],
          state: ['PA'],
          postalCode: ['']
        })
      ]),
      clientType: ['', Validators.required],
      notes: [''],
      customerID: ['']
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
    //@ts-ignore
    API.get('LehighCRMApi', '/items/getcustomerid').then((v) => {
      this.form.controls['customerID'].setValue(Number(v))
    })
  }

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }
  get f1() {
    return this.form;
  }

  createCustomer() {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    this.loader = true;
    this.customerData = this.form.getRawValue();
    const createCustomer = async () => {
      // @ts-ignore
      const data = await API.post('LehighCRMApi', '/items/createCustomer', {
        body: {
          CustomerData: {
            ...this.form.getRawValue(),
            CreateDate: new Date().toISOString(),
            Agent: this.authAgentName.attributes?.name,
          },
          IS_TOUCHED: 'False',
        },
      });
      if (data.message == 'item created') {
        localStorage.removeItem('listCustomers')
        this.isButtonVisible = true;
        this.loader = false;
      }
    };
    createCustomer().then((r) => console.log(r));
  }

  Cancel(){
    this.router.navigate(['home/listcustomer'])
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

}
