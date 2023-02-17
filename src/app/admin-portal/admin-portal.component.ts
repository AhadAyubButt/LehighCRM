import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { API, Storage } from 'aws-amplify';
import { Modal } from "bootstrap";
import { DomSanitizer } from '@angular/platform-browser';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.component.html',
  styleUrls: ['./admin-portal.component.css'],
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
export class AdminPortalComponent implements OnInit {
  // @ViewChild("listBody")
  // ListBody!: ElementRef;

  usersList?: any;
  userData: any;

  companiesList: any;
  companyData: any;

  salesTypeList: any;
  salesTypeData: any;

  recordPaymentList: any;
  recordPaymentData: any;

  userForm: FormGroup;
  companyForm: FormGroup;
  salesForm: FormGroup;
  recordForm: FormGroup;

  file!: any;
  imgPreview!: any

  loader = false;

  constructor(private fb: FormBuilder, private sanitizer:DomSanitizer) {

    this.userForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      tempPass: [''],
      role: [''],
      picture: [''],
      phone: ['']
    });

    this.companyForm = this.fb.group({
      CompanyName: ['']
    })

    this.salesForm = this.fb.group({
      SalesTypeName: ['']
    })

    this.recordForm = this.fb.group({
      RecordPaymentName: ['']
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listUser").then((response) => {
      response.Users.forEach((val:any) => {

        API.post("LehighCRMApi", "/items/getGroupForUser", {
          body: {
            email: val.Username
          }
        }).then((response) => {
          val['group'] = response
        })
        val.Attributes.forEach((v:any) => {
          let attr = v.Name
          val[attr] = v.Value
        })
      })
      this.usersList = response.Users;
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listCompanies").then((response) => {
      this.companiesList = response.Items
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listSalesType").then((response) => {
      this.salesTypeList = response.Items
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listRecordPayment").then((response) => {
      this.recordPaymentList = response.Items
    })


   }

  ngOnInit(): void {
  }

  //User Functions start
  addUser() {
    (document.querySelector('.list-user-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.create-user-body') as HTMLElement).style.display = 'block';
    
  }

  editUser(user:any) {
    console.log(user)
    this.userData = user;
    (document.querySelector('.list-user-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-user-body') as HTMLElement).style.display = 'block';
    this.userForm.controls['firstName'].setValue(user['name'].split(" ", 1)[0])
    this.userForm.controls['lastName'].setValue(user['name'].split(" ", 2)[1])
    this.userForm.controls['email'].setValue(user['email'])
    this.userForm.controls['phone'].setValue(user['phone_number'])
    this.userForm.controls['role'].setValue(user['group'])
    this.userForm.controls['picture'].setValue(user['picture'])

  }

  cancelUser() {
    (document.querySelector('.list-user-body') as HTMLElement).style.display = 'block';
    (document.querySelector('.create-user-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-user-body') as HTMLElement).style.display = 'none';
    this.userForm.reset()
  }

  enableUser(user:any) {
    API.put("LehighCRMApi", "/items/enableUser", {
      body: {
        "email": user.Username,
        "role": user.group,
        "name": user.name
      }
    }).then((v) => {
      console.log(v)
      if(v == "User enabled") {
        user.Enabled = true;
      }
    })
  }

  disableUser(user:any) {
    API.put("LehighCRMApi", "/items/disableUser", {
      body: {
        "email": user.Username,
        "role": user.group,
        "name": user.name
      }
    }).then((v) => {
      console.log(v)
      if(v == "User disabled") {
        user.Enabled = false;
      }
    })
  }

  createUser() {
    if(this.file) {
      this.loader = true;
      Storage.put("users/" + this.userForm.getRawValue()['firstName'], this.file).then((v) => {
        this.userForm.controls['picture'].setValue("" + this.userForm.getRawValue()['firstName'])
  
        API.post("LehighCRMApi", "/items/createUser", {
        body: {
          ...this.userForm.getRawValue()
        }
      }).then((response) => {
        console.log(response)
        if (response == "User created") {
          API.post("LehighCRMApi", "/items/addUserToGroup", {
            body: {
              ...this.userForm.getRawValue()
            }
          }).then((v) => {
            console.log(v)
            if(v == "User added to group") {
              this.loader = false;
              Swal.fire({
                title: 'User Created Successfully..',
                icon: 'success',
                background: '#F7FCFF',
                confirmButtonColor: 'black',
                color: '#1B428C',
              });
              window.location.reload()
            }
          })
        }
      })
      })
    }
    else {
      this.loader = true;
      API.post("LehighCRMApi", "/items/createUser", {
        body: {
          ...this.userForm.getRawValue()
        }
      }).then((response) => {
        if (response == "User created") {
          API.post("LehighCRMApi", "/items/addUserToGroup", {
            body: {
              ...this.userForm.getRawValue()
            }
          }).then((v) => {
            if(v == "User added to group") {
              this.loader = false;
              Swal.fire({
                title: 'User Created Successfully.',
                icon: 'success',
                background: '#F7FCFF',
                confirmButtonColor: 'black',
                color: '#1B428C',
              });
              window.location.reload()
            }
          })
        }
      })
    }
    console.log(this.userForm.getRawValue())
  }

  updateUser() {
    if(this.file) {
      this.loader = true;
      Storage.put("users/" + this.userForm.getRawValue()['firstName'], this.file).then((v) => {
        this.userForm.controls['picture'].setValue("" + this.userForm.getRawValue()['firstName'])

        API.put("LehighCRMApi", "/items/updateUser", {
          body: {
            ...this.userForm.getRawValue()
          }
        }).then((response) => {
          if (response == "User updated") {
            this.loader = false;
            Swal.fire({
              title: 'User Updated Successfully.',
              icon: 'success',
              background: '#F7FCFF',
              confirmButtonColor: 'black',
              color: '#1B428C',
            });
            window.location.reload()
          }
        })
      })
    }

    else {
      this.loader = true;
      API.put("LehighCRMApi", "/items/updateUser", {
        body: {
          ...this.userForm.getRawValue()
        }
      }).then((response) => {
        if (response == "User updated") {
          Swal.fire({
            title: 'User Updated Successfully.',
            icon: 'success',
            background: '#F7FCFF',
            confirmButtonColor: 'black',
            color: '#1B428C',
          });
          this.loader = false;
          window.location.reload()
        }
      })
    }
    
  }

  openPassModal(user:any) {
    this.userForm.controls['email'].setValue(user['email'])
    let modal = new Modal(document.getElementById('PassModal')!);
    modal.show();
  }

  changePass() {
    console.log(this.userForm.getRawValue())
    API.put("LehighCRMApi", "/items/setUserPassword", {
      body: {
        ...this.userForm.getRawValue()
      }
    }).then((response) => {
      console.log(response)
      if (response == "Password changed") {
        window.location.reload()
      }
    })
  }

  uploadFile(event:any) {
    this.imgPreview = ''
    console.log(event.target.files[0])
    this.file = event.target.files[0]
    this.imgPreview = URL.createObjectURL(event.target.files[0]);
    (document.getElementById('frame') as HTMLImageElement).src = this.imgPreview;
    (document.querySelector('.bi-camera') as HTMLElement).style.display = 'none';
    (document.querySelector('.select-img-txt') as HTMLElement).style.display = 'none';
    // Storage.put("users/harris", event.target.files[0]).then((v) => {
    //   console.log(v)
    // })
  }

  uploadFileEdit(event:any) {
    this.imgPreview = ''
    this.file = event.target.files[0]
    console.log(event.target.files[0])
    this.file = event.target.files[0]
    this.userData.picture = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(event.target.files[0]));

    // (document.getElementById('frameEdit') as HTMLImageElement).src = this.imgPreview;
  }

  //User Functions end

  //Company Functions start
  addCompany() {
    (document.querySelector('.list-company-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.create-company-body') as HTMLElement).style.display = 'block';
    
  }

  editCompany(company:any) {
    this.companyData = company;
    (document.querySelector('.list-company-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-company-body') as HTMLElement).style.display = 'block';
    
    this.companyForm.controls['CompanyName'].setValue(company.CompanyName)
  }

  cancelCompany() {
    (document.querySelector('.list-company-body') as HTMLElement).style.display = 'block';
    (document.querySelector('.create-company-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-company-body') as HTMLElement).style.display = 'none';
    
  }

  createCompany() {
    this.loader = true;
    API.post("LehighCRMApi", "/items/createCompany", {
      body: {
        ...this.companyForm.getRawValue()
      }
    }).then((v) => {
      if(v == 'Company created') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  updateCompany() {
    this.loader = true;
    this.companyData.CompanyName = this.companyForm.getRawValue()['CompanyName']
    API.put("LehighCRMApi", "/items/updateCompany", {
      body: {
        ...this.companyData
      }
    }).then((v) => {
      if(v == 'company updated') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  enableCompany(company:any) {
    console.log(company)
    company.isActive = true;
    API.put("LehighCRMApi", "/items/updateCompany", {
      body: {
        ...company
      }
    })
  }

  disableCompany(company:any) {
    console.log(company)
    company.isActive = false;
    API.put("LehighCRMApi", "/items/updateCompany", {
      body: {
        ...company
      }
    })
  }

  //Company Functions end

  //Sales Type Functions start
  addSale() {
    (document.querySelector('.list-sale-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.create-sale-body') as HTMLElement).style.display = 'block';
    
  }

  editSale(sale:any) {
    this.salesTypeData = sale;
    this.salesForm.controls['SalesTypeName'].setValue(sale.SalesTypeName);

    (document.querySelector('.list-sale-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-sale-body') as HTMLElement).style.display = 'block';
    
  }

  cancelSale() {
    (document.querySelector('.list-sale-body') as HTMLElement).style.display = 'block';
    (document.querySelector('.create-sale-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-sale-body') as HTMLElement).style.display = 'none';
    
  }

  createSalesType() {
    this.loader = true;
    API.post("LehighCRMApi", "/items/createSalesType", {
      body: {
        ...this.salesForm.getRawValue()
      }
    }).then((v) => {
      if(v == 'Sales Type created') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  updateSalesType() {
    this.loader = true;
    this.salesTypeData.SalesTypeName = this.salesForm.getRawValue()['SalesTypeName']
    API.put("LehighCRMApi", "/items/updateSalesType", {
      body: {
        ...this.salesTypeData
      }
    }).then((v) => {
      if(v == 'Sales Type updated') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  enableSalesType(sales:any) {
    console.log(sales)
    sales.isActive = true;
    API.put("LehighCRMApi", "/items/updateSalesType", {
      body: {
        ...sales
      }
    })
  }

  disableSalesType(sales:any) {
    console.log(sales)
    sales.isActive = false;
    API.put("LehighCRMApi", "/items/updateSalesType", {
      body: {
        ...sales
      }
    })
  }

  //Sales Type Functions end

  //Record Payment Functions start
  addRecord() {
    (document.querySelector('.list-record-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.create-record-body') as HTMLElement).style.display = 'block';
    
  }

  editRecord(record:any) {
    this.recordPaymentData = record;
    this.recordForm.controls['RecordPaymentName'].setValue(record.RecordPaymentName);

    (document.querySelector('.list-record-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-record-body') as HTMLElement).style.display = 'block';
  }

  cancelRecord() {
    (document.querySelector('.list-record-body') as HTMLElement).style.display = 'block';
    (document.querySelector('.create-record-body') as HTMLElement).style.display = 'none';
    (document.querySelector('.edit-record-body') as HTMLElement).style.display = 'none';
    
  }

  createRecordPayment() {
    this.loader = true;
    API.post("LehighCRMApi", "/items/createRecordPayment", {
      body: {
        ...this.recordForm.getRawValue()
      }
    }).then((v) => {
      if(v == 'Record Payment created') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  updateRecordPayment() {
    this.loader = true;
    this.recordPaymentData.RecordPaymentName = this.recordForm.getRawValue()['RecordPaymentName']
    API.put("LehighCRMApi", "/items/updateRecordPayment", {
      body: {
        ...this.recordPaymentData
      }
    }).then((v) => {
      if(v == 'Record Payment updated') {
        this.loader = false;
        window.location.reload()
      }
    })
  }

  enableRecordPayment(record:any) {
    console.log(record)
    record.isActive = true;
    API.put("LehighCRMApi", "/items/updateRecordPayment", {
      body: {
        ...record
      }
    })
    
  }

  disableRecordPayment(record:any) {
    console.log(record)
    record.isActive = false;
    API.put("LehighCRMApi", "/items/updateRecordPayment", {
      body: {
        ...record
      }
    })
    
  }

  //Record Payment Functions end

}
