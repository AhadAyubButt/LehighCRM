import { API } from 'aws-amplify';
import { ICustomer } from 'src/interfaces/icustomer';
import { Component, OnDestroy, OnInit } from "@angular/core";
import { animate, keyframes, state, style, transition, trigger } from "@angular/animations";
import { FormControl } from "@angular/forms";
import { NavigationExtras, Router } from "@angular/router";
import { AuthService } from "src/services/auth.service";
import { Subscription } from "rxjs";
import { Content } from "@angular/compiler/src/render3/r3_ast";
import { CustomerService } from "src/services/customer.service";
import { Button } from 'bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-customer',
  templateUrl: './list-customer.component.html',
  styleUrls: ['./list-customer.component.css'],
  animations: [
    trigger("load", [
      // ...
      state(
        "load",
        style({
          opacity: 1
        })
      ),
      state(
        "done",
        style({
          opacity: 0.1
        })
      ),
      transition("load => done", [animate(0)]),
      transition(":enter", [
        animate(
          "20s",
          keyframes([
            style({ transform: "rotate(0deg)", offset: 0 }),
            style({ transform: "rotate(9999deg)", offset: 1 })
          ])
        )
      ])
    ])
  ]
})
export class ListCustomerComponent implements OnInit {

  ListCustomer? : ICustomer[];
  checkForm: FormControl;
  private sub: Subscription;

  constructor(private router: Router, private auth: AuthService, private customerService: CustomerService) { 
    this.checkForm = new FormControl();
    this.sub = this.customerService.filterCustomerData.subscribe(value => {
      this.ListCustomer = value;
      localStorage.setItem("listCustomers", JSON.stringify(value));
    });
  }

  ngOnInit(): void {
    this.ListCustomer = undefined;
    if (JSON.parse(localStorage.getItem("listCustomers")!) != undefined) {
        this.ListCustomer = JSON.parse(localStorage.getItem("listCustomers")!)
    } else {
      this.customerService.listAllCustomers();
    }
  }

  getCustomer(item: any) {
    const nav: NavigationExtras = {
      state: {
        data: item
      }
    };
    this.router.navigate(["home", "readcustomer"], nav);
  }

  checkit() {
    
}

  // toJob() {
  //   localStorage.setItem("jobCreation", JSON.stringify(this.checkForm.value));
  //   const extra: NavigationExtras = {
  //     state: { data: this.checkForm }
  //   };
  //   this.router.navigate(["home", "job"]);
  // }

  toJob(customer: any) {
    localStorage.setItem("jobCreation", JSON.stringify(customer));
    const extra: NavigationExtras = {
      state: { data: customer }
    };
    this.router.navigate(["home", "job"]);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ListCustomer = []
  }

  deleteCustomer(customer:any) {
    Swal.fire({
      title: 'Do you want to delete this customer?',
      showDenyButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: 'maroon',
      denyButtonColor: 'grey',
      denyButtonText: `Cancel`,
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Deleted Successfully!', '', 'success')
        API.put("LehighCRMApi", "/items/deleteCustomer", {
          body: {
            ...customer
          }
        }).then((val:any) => {
          if(val.message == "customer deleted") {
            window.location.reload();
          }
        })
      } else if (result.isDenied) {
        Swal.fire('Customer not deleted!', '', 'info')
      }
    });
  }

}
