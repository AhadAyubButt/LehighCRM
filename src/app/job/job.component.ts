import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ICustomer } from '../../interfaces/icustomer';
import { IJob } from '../../interfaces/ijob';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { NavigationExtras, NavigationStart, Router } from "@angular/router";
import { AuthService } from "src/services/auth.service";
import { Modal } from "bootstrap";
import * as JSZip from 'jszip';
import { API, Auth, Storage } from 'aws-amplify'
import { filter, Subject, Subscription, interval, Observable } from "rxjs";
import {v4 as uuidv4} from 'uuid';
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse, HttpHeaders } from "@angular/common/http";
import { Agent } from 'http';
import { DeactivateGuard } from '../deactivate.guard';
import { DatePipe } from '@angular/common'
import Swal from 'sweetalert2';
import { CheckboxComponent } from '@aws-amplify/ui-angular';

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.css'],
  providers: [DatePipe]
})
export class JobComponent implements OnInit, OnDestroy {
  
  public authAgentName: string = "";
  CustomerData!: ICustomer;
  jobForm: FormGroup;
  private delIndex?: number;
  submitted = false;
  create_Invoice = false;
  files: File[] = [];
  watchLen: Subject<number>;
  checkForm: FormControl;
  valueInPercent: number = 0;
  discountInPercent: number = 0;
  attachName = "";
  totalAmount: any = 0;
  subTotal: any = 0;
  phone: any;
  jobID: any;
  loader = false;
  invoiceCreated = false;
  InvoiceID: any;
  private routerSubscription?: Subscription;
  jobstatus?: string;
  display = 'none';
  CheckInput: any;
  addressArray:any = [];
  salesTypeList: any = [];
  recordPaymentList: any = [];
  technicianList: any = [];
  cardForm: FormGroup;
  jobSK: any;
  isPayment = false;

  get productPayment(): any {
    return this.jobForm.get(["ProductPayment"]);
  }

  get jobInfo(): any {
    return this.jobForm.get(["JobInfo"]);
  }
  constructor(private router: Router, private fb: FormBuilder, private auth: AuthService, private http: HttpClient, private deactGuard: DeactivateGuard, public datepipe: DatePipe) { 
    this.CustomerData = JSON.parse(localStorage.getItem("jobCreation")!);
    this.CustomerData?.CustomerData.AddressData.forEach((v) => {
      const address = v.address1 + ' ' + v.city + ', ' + v.state + ' ' + v.postalCode
      this.addressArray.push(address)
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listSalesType").then((response) => {
      response.Items.forEach((v:any) => {
        if(v.isActive == true) {
          this.salesTypeList.push(v)
        }
      })
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listRecordPayment").then((response) => {
      response.Items.forEach((v:any) => {
        if(v.isActive == true) {
          this.recordPaymentList.push(v)
        }
      })
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listTechnician").then((response) => {
      response.Items.forEach((v:any) => {
        if(v.isActive == true) {
          this.technicianList.push(v)
        }
      })
    })

    let dateTime = new Date()
    let latest_date =this.datepipe.transform(dateTime, 'yyyy-MM-dd');

    this.checkForm = new FormControl();

    this.jobForm = this.fb.group({
      JobInfo: this.fb.group({
        company: ["Lehigh HVAC", Validators.required],
        salesType: ["", Validators.required],
        technician: ["", Validators.required],
        primaryAgent: [this.CustomerData.CustomerData.Agent],
        secondaryAgent: [this.authAgentName],
        jobDate: [latest_date]
      }),
      ProductPayment: this.fb.array([
        this.fb.group({
          lineItem: [null, Validators.required],
          rate: [0, Validators.required],
          quantity: [0, Validators.required]
        })
      ]),
      Description: [""],
      paymentStatus: [""],
      paymentStatusType: ["UNPAID"],
      paymentType: [""],
      totalAmount: [""],
      jobAddress: [this.addressArray[0]],
      jobPhone: [this.CustomerData?.CustomerData.phone],
      markUp: [20],
      discount: [0],
      labourCost: [0],
      attachment: [""],
      lineItemNotes: [""],
      paymentFirstName: [this.CustomerData?.CustomerData.firstName],
      paymentLastName: [this.CustomerData?.CustomerData.lastName],
      paymentEmail: [this.CustomerData?.CustomerData.email],
      paymentChequeAmount: [""],
      paymentChequeNumber: [""],
      paymentTransactionID: [""],
      paymentInvoiceID: [""],
      paymentAmount: ["0"],
      paymentAmountLeft: [""]
    });

    this.cardForm = this.fb.group({
      ccNumber: ['', [Validators.required,Validators.minLength(16),Validators.min(1111111111111111),Validators.max(9999999999999999)]],
      ccExp: [''],
      cvv: ['', [Validators.required,Validators.minLength(3),Validators.maxLength(3),Validators.min(111),Validators.max(999)]],
      postalCode:['']
    })

    this.watchLen = new Subject<number>();

    this.checkForm = new FormControl();
    
    this.checkForm.valueChanges.subscribe((v:any)=>{
      this.totalAmount = 0;

      this.productPayment.controls.forEach((v:any) => {
        this.totalAmount += Number(v.controls.rate.value) * Number(v.controls.quantity.value);
        this.subTotal += Number(v.controls.rate.value) * Number(v.controls.quantity.value);
      })
      const valuePercent = this.totalAmount * (this.jobForm.getRawValue().markUp/100)
      this.totalAmount = this.totalAmount + valuePercent + Number(this.jobForm.getRawValue().labourCost);
      this.subTotal = this.totalAmount;

      if(this.checkForm.value == true){
        const discountPercent = this.totalAmount * (this.jobForm.getRawValue().discount/100);
        this.totalAmount = (this.totalAmount - discountPercent).toFixed(2);
        this.jobForm.controls['paymentAmount'].setValue(this.totalAmount)
        this.jobForm.controls['paymentAmountLeft'].setValue(this.totalAmount)
      }
      else{
        this.totalAmount = (this.totalAmount - this.jobForm.getRawValue().discount).toFixed(2);
        this.jobForm.controls['paymentAmount'].setValue(this.totalAmount)
        this.jobForm.controls['paymentAmountLeft'].setValue(this.totalAmount)
      }
    });

    this.jobForm.controls['paymentStatus'].valueChanges.subscribe((v:any) => {
      if(v == false){
        this.jobForm.controls['paymentStatusType'].disable();
        this.jobForm.controls['paymentStatusType'].setValue("UNPAID");
        // let check = document.getElementById("checkPayment")!;
      }
      else if(v == true){
        this.jobForm.controls['paymentStatusType'].enable();
      }
      
    })

    this.jobForm.valueChanges.subscribe((v:any) => {
      this.totalAmount = 0;
      this.productPayment.controls.forEach((v:any) => {
        this.totalAmount += v.controls.rate.value * v.controls.quantity.value;
        this.subTotal += v.controls.rate.value * v.controls.quantity.value;
      })
      const valuePercent = this.totalAmount * (this.jobForm.getRawValue().markUp/100)
      this.totalAmount = this.totalAmount + valuePercent + this.jobForm.getRawValue().labourCost;
      this.subTotal = this.totalAmount;

      if(this.checkForm.value == true){
        const discountPercent = this.totalAmount * (this.jobForm.getRawValue().discount/100);
        this.totalAmount = (this.totalAmount - discountPercent).toFixed(2);

      }else{
        this.totalAmount = (this.totalAmount - this.jobForm.getRawValue().discount).toFixed(2);
      }

    });

    this.jobForm.controls['paymentType'].valueChanges.subscribe((v:any) => {
      if (this.jobForm.controls['paymentType'].value == 'Credit Card'){
        this.jobForm.controls['paymentAmount'].setValue(this.totalAmount)
        this.jobForm.controls['paymentAmountLeft'].setValue(this.totalAmount)
        
        let btn = document.getElementById("close-modal")
        btn?.click();

        let CardPaymentmodal = new Modal(document.getElementById("CardPaymentModal")!);
        CardPaymentmodal?.toggle();
        CardPaymentmodal?.show();
      }

      if (this.jobForm.controls['paymentType'].value == 'Cheque'){
        this.jobForm.controls['paymentAmount'].setValue(this.totalAmount)
        this.jobForm.controls['paymentAmountLeft'].setValue(this.totalAmount)

        let btn = document.getElementById("close-modal")
        btn?.click();

        let ChequePaymentmodal = new Modal(document.getElementById("ChequePaymentModal")!);
        ChequePaymentmodal?.toggle();
        ChequePaymentmodal?.show();
      }

    })

  }
  
  ngOnInit(): void {
    this.auth.getAgent().then((value) => (this.authAgentName = value.attributes.name));
    this.jobForm.controls['paymentStatusType'].disable();

    this.jobstatus = undefined;
    // this.routerSubscription = this.router.events
    //   .pipe(filter((value) => value instanceof NavigationStart))
    //   .subscribe((value1) => {
    //     if (this.jobstatus) {
    //       this.deactGuard.canDeact = true;
    //     } else {
    //       const res = confirm("Are you sure you want to leave this page?");
    //       if (!res) {
    //         this.deactGuard.canDeact = false;
    //       } else {
    //         this.deactGuard.canDeact = true;
    //       }
    //     }
    //   });

      this.routerSubscription = this.router.events
      .pipe(filter((value) => value instanceof NavigationStart))
      .subscribe((value1) => {
        if (this.jobstatus) {
          this.deactGuard.canDeact = true;
        } else {
          this.deactGuard.canDeact = false;
          Swal.fire({
            title: 'You are leaving job section, would you like to save this job?',
            icon: 'warning',
            background: '#F7FCFF',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Yes',
            confirmButtonColor: '#1B428C',
            denyButtonColor: 'grey',
            denyButtonText: `Stay`,
            cancelButtonText: `Leave`,
            cancelButtonColor: 'red',
          }).then((result) => {
            if (result.isConfirmed) {
              let jobData = this.jobForm.getRawValue()
              if (jobData['paymentStatus'] == "" || jobData['paymentStatus'] == false) {
                jobData['paymentStatus'] = "Quote"
              }
              else {
                jobData['paymentStatus'] = "Sales"
              }
              // if (jobData['paymentStatusType'] == "" || jobData['paymentStatusType'] == false) {
              //   jobData['paymentStatusType'] = "UNPAID"
              // }
              // else {
              //   jobData['paymentStatusType'] = "PAID"
              // }
              this.zip();
              // Swal Modal
              let modal = Modal.getInstance(document.getElementById("staticBackdropSubmit")!);
              this.submitted = true;
              this.loader = true;
              
              const createJob = async () => {
                if(this.invoiceCreated == true) {
                  this.InvoiceID = '_PO_' + this.jobID.toString() + '.pdf'
                }
                else {
                  this.InvoiceID = ""
                }

                let PK = 'customer#' + this.CustomerData.CustomerData.customerID
                let dabody: IJob = <IJob>{
                  PK: encodeURIComponent(PK),
                  JobData: {
                    ...jobData,
                    leadName: `${this.CustomerData.CustomerData.firstName} ${this.CustomerData.CustomerData.lastName}`,
                    CreateDate: new Date().toISOString(),
                    InvoiceID: this.InvoiceID
                  }
                };
                dabody.JobData.JobInfo.secondaryAgent = this.authAgentName;

                // dabody.JobData.ProductPayment.status = this.paypal_create?.status;
                dabody.JobData.totalAmount = 0;
                this.productPayment.controls.forEach((val: any) => {
                  dabody.JobData.totalAmount += val.controls["quantity"].value * val.controls["rate"].value;
                });
                this.valueInPercent = dabody.JobData.totalAmount * (this.jobForm.getRawValue().markUp/100)
                dabody.JobData.subTotal = dabody.JobData.totalAmount + this.valueInPercent + this.jobForm.getRawValue().labourCost;
                if(this.checkForm.value == true){
                  this.discountInPercent = dabody.JobData.subTotal * (this.jobForm.getRawValue().discount/100);
                  dabody.JobData.total = dabody.JobData.subTotal - this.discountInPercent;
                  dabody.JobData.discountType = true

                }
                else{
                  dabody.JobData.total = dabody.JobData.subTotal - this.jobForm.getRawValue().discount;
                  dabody.JobData.discountType = false
                }
                // @ts-ignore
                const data = await API.post("LehighCRMApi", "/items/createJob", {
                  body: { ...dabody }
                });

                if (data == "item created") {
                  modal?.hide();
                  this.jobstatus = data;
                  this.router.navigateByUrl("/home", { skipLocationChange: true }).then(() => {
                    localStorage.removeItem("listJob");
                    this.router.navigate(["home", "listjob"]).then(() => console.log("done"));
                  });
                  this.loader = false;
                  modal?.hide();
                  Swal.fire({
                  title: 'Job Created Successfully',
                  icon: 'success',
                  background: '#F7FCFF',
                  confirmButtonColor: 'black',
                  color: '#1B428C',
                });
                this.deactGuard.canDeact = true;
                }
              };
              
              createJob();
            } else if (result.isDenied) {
              this.deactGuard.canDeact = false;
            } else if(result.isDismissed){
              this.jobstatus = "Data";
                  this.router.navigateByUrl("/home", { skipLocationChange: true }).then(() => {
                    // localStorage.removeItem("listJob");
                    this.router.navigate(["home", "listcustomer"]).then(() => console.log("done"));
                  });
              this.deactGuard.canDeact = true;
            }
          });
        }
      });

    let _len = this.productPayment.controls.length;
    this.productPayment.valueChanges.subscribe((item: FormArray) => {
      if (this.productPayment.controls.length > _len) {
        _len = this.productPayment.controls.length;
        this.watchLen.next(_len);
      } else if (_len == 1) {
        _len = this.productPayment.controls.length;
        this.watchLen.next(_len);
      } else {
        _len = this.productPayment.controls.length;
        this.watchLen.next(_len);
      }
    });

    //@ts-ignore
    API.get('LehighCRMApi', '/items/listjobid').then((value) => {
      this.jobID = value.Items[0].JobID
    });

    // this.formatPhone();
  }

  get f(): AbstractControl | null {
    return this.jobForm.get(["JobInfo"]);
  }

  get f1() { return this.cardForm.controls; }

  openModal() {
    const SaveButton = document.getElementById("SaveButton") as HTMLButtonElement | null;
    SaveButton?.setAttribute('disabled', '');
    console.log("Disabled: ", SaveButton);
    Swal.fire({
      title: 'Are you sure you want to submit job?',
      icon: 'info',
      background: '#F7FCFF',
      showDenyButton: true,
      confirmButtonText: 'Yes',
      confirmButtonColor: '#1B428C',
      denyButtonColor: 'grey',
      denyButtonText: `Cancel`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.submitJob();
      } else if (result.isDenied) {
        Swal.fire('Job Cancelled!', '', 'warning');
        SaveButton?.removeAttribute('disabled');
      }
    });
  }

  openModal2(){
    let modal = new Modal(document.getElementById("exampleModal")!);
    modal?.toggle();
    modal?.show();
  }

  closeChequeModal() {
    let btn = document.getElementById("close-cheque-modal")
    btn?.click();

    let Accord = document.getElementById("CFour")!;
    Accord.click();
  }

  closeModal(){
    let modal = new Modal(document.getElementById("exampleModal")!);
    modal?.hide()
    let Accord = document.getElementById("CFour")!;
    Accord.click();
  }

  deleteProductPaymentItem() {
    const ship = this.jobForm.controls["ProductPayment"] as FormArray;
    ship.removeAt(this.delIndex!);
  }

  addProductPaymentItem() {
    const ship = this.jobForm.controls["ProductPayment"] as FormArray;
    ship.push(
      this.fb.group({
        lineItem: [null, Validators.required],
        rate: [0, Validators.required],
        quantity: [0, Validators.required]
      })
    );
  }

  formatPhone(){
    this.phone = this.CustomerData.CustomerData.phone;
    if (this.phone.length === 0) {
      this.phone = '';
    } else if (this.phone.length <= 3) {
      this.phone = this.phone.replace(/^(\d{0,3})/, '($1)');
    } else if (this.phone.length <= 6) {
      this.phone = this.phone.replace(/^(\d{0,3})(\d{0,3})/, '($1) $2');
    } else if (this.phone.length <= 10) {
      this.phone = this.phone.replace(/^(\d{0,3})(\d{0,3})(\d{0,4})/, '($1) $2-$3');
    } else {
      this.phone = this.phone.substring(0, 10);
      this.phone = this.phone.replace(/^(\d{0,3})(\d{0,3})(\d{0,4})/, '($1) $2-$3');
    }
    this.CustomerData.CustomerData.phone = this.phone;
  }

  Cancel() {
    this.router.navigate(["home/dashboard"]);
  }

  select_modal_del(i: number) {
    this.delIndex = i;
    let mod = new Modal("#staticBackdrop2");
    mod.show();
  }

  select_modal() {
    this.create_Invoice = true;
    // if ((this.productPayment as FormArray).valid) {
      let mod = new Modal("#staticBackdropPay");
      mod.show();
    // }
  }

  onSelect(event:any) {
    this.files.push(...event.addedFiles);
  }

  zip(){
    if(this.files.length > 0) {
      this.attachName = '_PO_' + this.jobID.toString();
      this.jobForm.controls['attachment'].setValue(this.attachName)
  
      this.files.forEach((v) => {
        Storage.put("attachment/" + this.attachName + '/' + v.name, v).then((val)=>{
        })
      })
    }
  }
  
  onRemove(event:any) {
    this.files.splice(this.files.indexOf(event), 1);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    localStorage.removeItem("jobCreation");
  }

  submitJob() {
    this.zip();

    console.log(this.jobForm.getRawValue())
    let jobData = this.jobForm.getRawValue()
    if (jobData['paymentStatus'] == "" || jobData['paymentStatus'] == false) {
      jobData['paymentStatus'] = "Quote"
    }
    else {
      jobData['paymentStatus'] = "Sales"
    }
    // if (jobData['paymentStatusType'] == "" || jobData['paymentStatusType'] == false) {
    //   jobData['paymentStatusType'] = "UNPAID"
    // }
    // else {
    //   jobData['paymentStatusType'] = "PAID"
    // }
    let modal = Modal.getInstance(document.getElementById("staticBackdropSubmit")!);
    this.submitted = true;
    if (this.jobForm.invalid) {
      const SaveButton = document.getElementById("SaveButton") as HTMLButtonElement | null;
      SaveButton?.removeAttribute('disabled');
      return;
    }

    const createJob = async () => {
      if(this.invoiceCreated == true) {
        this.InvoiceID = '_PO_' + this.jobID.toString() + '.pdf'
      }
      else {
        this.InvoiceID = ""
      }

      let PK = 'customer#' + this.CustomerData.CustomerData.customerID
      let dabody: IJob = <IJob>{
        PK: encodeURIComponent(PK),
        JobData: {
          ...jobData,
          leadName: `${this.CustomerData.CustomerData.firstName} ${this.CustomerData.CustomerData.lastName}`,
          CreateDate: new Date().toISOString(),
          InvoiceID: this.InvoiceID
        }
      };
      dabody.JobData.JobInfo.secondaryAgent = this.authAgentName;
      dabody.JobData.totalAmount = 0;
      this.productPayment.controls.forEach((val: any) => {
        dabody.JobData.totalAmount += val.controls["quantity"].value * val.controls["rate"].value;
      });
      this.valueInPercent = dabody.JobData.totalAmount * (this.jobForm.getRawValue().markUp/100)
      dabody.JobData.subTotal = dabody.JobData.totalAmount + this.valueInPercent + this.jobForm.getRawValue().labourCost;
      if(this.checkForm.value == true){
        this.discountInPercent = dabody.JobData.subTotal * (this.jobForm.getRawValue().discount/100);
        dabody.JobData.total = dabody.JobData.subTotal - this.discountInPercent;
        dabody.JobData.discountType = true

      }else{
        dabody.JobData.total = dabody.JobData.subTotal - this.jobForm.getRawValue().discount;
        dabody.JobData.discountType = false
      }
      // @ts-ignore
      const data = await API.post("LehighCRMApi", "/items/createJob", {
        body: { ...dabody }
      });
      this.jobSK = data['SK']

      if (data['Status'] == "item created") {
        Swal.fire({
          title: 'Job Created Successfully',
          icon: 'success',
          background: '#F7FCFF',
          confirmButtonColor: 'black',
          color: '#1B428C',
        })
        modal?.hide();
        localStorage.removeItem("listJob");
        this.jobstatus = data;
        this.loader = false;
        // Change Route
        // this.router.navigate(["home", "dashboard"]);
      }
      else {
        Swal.fire('Job Not Saved!', '', 'warning')
        const SaveButton = document.getElementById("SaveButton") as HTMLButtonElement | null;
        SaveButton?.removeAttribute('disabled');
      }
      modal?.hide();
    };
    
    createJob();
  }

  createInvoice() {
    const obj = {
      "JobData": {
        "JobForm": this.jobForm.getRawValue(),
        "Total": this.totalAmount,
        "subTotal": this.subTotal,
        "discountType": this.checkForm.value,
        "JobID": this.jobID.toString()
      },
      "CustomerData": this.CustomerData,
      "Agent": this.authAgentName
    }
    if (this.jobForm.getRawValue()['paymentStatus'] == "" || this.jobForm.getRawValue()['paymentStatus'] == false) {
      obj["JobData"]["JobForm"]["paymentStatus"] = "Quote"
    }
    else {
      obj["JobData"]["JobForm"]["paymentStatus"] = "Sales"
    }
    // if (this.jobForm.getRawValue()['paymentStatusType'] == "" || this.jobForm.getRawValue()['paymentStatusType'] == false) {
    //   obj["JobData"]["JobForm"]['paymentStatusType'] = "UNPAID"
    // }
    // else {
    //   obj["JobData"]["JobForm"]['paymentStatusType'] = "PAID"
    // }
    this.loader = true;
    API.post('LehighCRMApi', '/items/generateinvoice', {
      body: {
        ...obj
      }
    }).then((v) => {
      if (v.message == "Done") {
        this.invoiceCreated = true;
        this.loader = false;
      }
    })
  }

  showInvoice() {
    const link = document.createElement("a");
      link.setAttribute("target", "_blank");
      link.setAttribute("href", "" + this.jobID.toString() + ".pdf");
      link.setAttribute("download", "_PO_" + this.jobID.toString() + ".pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
  }

  addJobToCalendar() {
    console.log(this.jobSK)
    const extra: NavigationExtras = {
      state: { data: {
        ...this.jobForm.getRawValue(),
        leadName: `${this.CustomerData.CustomerData.firstName} ${this.CustomerData.CustomerData.lastName}`,
        JobID: this.jobID,
        total: this.totalAmount,
        SK: this.jobSK
      } }
    };
    this.router.navigate(["home", "calendar"], extra);
  }

  sendInvoice() {
    this.loader = true;
    API.post("LehighCRMPayment", "/items/sendInvoice", {
      body: {
        email: this.jobForm.getRawValue()['paymentEmail'],
        firstname: this.jobForm.getRawValue()['paymentFirstName'],
        lastname: this.jobForm.getRawValue()['paymentLastName'],
        amount: this.totalAmount,
      }
    }).then((v) => {
      this.loader = false;
      console.log(v)
      if (v['Status'] == "Approved") {
        Swal.fire({
          title: 'Invoice Sent Successfully',
          icon: 'success',
          background: '#F7FCFF',
          confirmButtonColor: 'black',
          color: '#1B428C',
        });
        let btn = document.getElementById("close-card-modal")
        btn?.click();
        this.jobForm.controls['paymentInvoiceID'].setValue(v['InvoiceID'])
        this.jobForm.controls['paymentStatus'].setValue(true)
      }

      else if (v['Status'] == "Error") {
        Swal.fire('Error sending Invoice!', '', 'warning')
      }

      else if (v['Status'] == "Declined") {
        Swal.fire('Invoice declined!', '', 'warning')
      }
    })
  }

  chargePayment() {
    this.loader = true;
    API.post("LehighCRMPayment", "/items/cardPayment", {
      body: {
        firstName: this.jobForm.getRawValue()['paymentFirstName'],
        lastName: this.jobForm.getRawValue()['paymentLastName'],
        email: this.jobForm.getRawValue()['paymentEmail'],
        ccnumber: this.cardForm.getRawValue()['ccNumber'],
        ccexp: this.cardForm.getRawValue()['ccExp'],
        cvv: this.cardForm.getRawValue()['cvv'],
        amount: this.totalAmount,
      }
    }).then((v) => {
      console.log(v)
      this.loader = false;
      if (v['Status'] == "Approved") {
        Swal.fire({
          title: 'Payment Approved',
          icon: 'success',
          background: '#F7FCFF',
          confirmButtonColor: 'black',
          color: '#1B428C',
        });
        let btn = document.getElementById("close-card-modal")
        btn?.click();
        this.jobForm.controls['paymentTransactionID'].setValue(v['TransactionID'])
        this.jobForm.controls['paymentStatus'].setValue(true)
        this.isPayment = true;

        if(Number(this.jobForm.getRawValue()['paymentAmount']) == Number(this.totalAmount)) {
          this.jobForm.controls['paymentStatusType'].setValue("PAID")
          this.jobForm.controls['paymentAmountLeft'].setValue("0")
        }
        else if(Number(this.jobForm.getRawValue()['paymentAmount']) < Number(this.totalAmount)) {
          this.jobForm.controls['paymentStatusType'].setValue("PARTIALLY PAID")
          this.jobForm.controls['paymentAmountLeft'].setValue((this.totalAmount - this.jobForm.getRawValue()['paymentAmount']).toString())
        }

      }

      else if (v['Status'] == "Error") {
        Swal.fire('Error! Please check the card Info or Amount.', '', 'warning')
      }

      else if (v['Status'] == "Declined") {
        Swal.fire('Card declined!', '', 'warning')
      }
    })
  }

  uploadFile(event:any) {
    console.log(event.target.files[0])
    Storage.put("cheque/cheque_" + this.jobID, event.target.files[0]).then((v) => {
      this.jobForm.controls['paymentStatus'].setValue(true)
      // this.jobForm.controls['paymentStatusType'].setValue("PAID")
    })
    this.isPayment = true;

    if(Number(this.jobForm.getRawValue()['paymentChequeAmount']) == Number(this.totalAmount)) {
      this.jobForm.controls['paymentAmount'].setValue(this.jobForm.getRawValue()['paymentChequeAmount'])
      this.jobForm.controls['paymentStatusType'].setValue("PAID")
      this.jobForm.controls['paymentAmountLeft'].setValue("0")
    }
    else if(Number(this.jobForm.getRawValue()['paymentChequeAmount']) < Number(this.totalAmount)) {
      this.jobForm.controls['paymentAmount'].setValue(this.jobForm.getRawValue()['paymentChequeAmount'])
      this.jobForm.controls['paymentStatusType'].setValue("PARTIALLY PAID")
      this.jobForm.controls['paymentAmountLeft'].setValue((this.totalAmount - this.jobForm.getRawValue()['paymentAmount']).toString())

    }

  }

}
