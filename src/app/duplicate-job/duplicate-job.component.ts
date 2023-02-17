import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { API, Storage } from 'aws-amplify';
import { ICustomer } from 'src/interfaces/icustomer';
import { IJob } from 'src/interfaces/ijob';
import { Modal } from "bootstrap";
import * as JSZip from 'jszip';
import { AuthService } from 'src/services/auth.service';
import { delay } from 'rxjs';
import { filter, Subject, Subscription, interval, Observable } from "rxjs";
import { NavigationExtras, NavigationStart, Router } from "@angular/router";
import { DeactivateGuard } from '../deactivate.guard';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-duplicate-job',
  templateUrl: './duplicate-job.component.html',
  styleUrls: ['./duplicate-job.component.css'],
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
  ],
  providers: [DatePipe]
})
export class DuplicateJobComponent implements OnInit, OnDestroy{
  CustomerData?: ICustomer;
  jobID: string = ""; // received from route
  jobInfo?: IJob;
  jobForm: FormGroup;
  cardForm: FormGroup;
  submitted = false;
  loader = false;
  invoiceCreated = false;
  InvoiceID: any;
  private delIndex?: number;
  create_Invoice = false;
  checkForm: FormControl;
  valueInPercent: number = 0;
  discountInPercent: number = 0;
  attachName = "";
  totalAmount: any = 0;
  subTotal: any = 0;
  phone: any;
  key: any;
  files: File[] = [];
  url: any = [];
  public authAgentName: string = "";
  myService: any;
  isDownload: boolean = false;
  isUpload: boolean = false;
  editable: boolean = false;
  jobstatus?: string;
  private routerSubscription?: Subscription;
  attachedFiles: any;
  addressArray?:any = [];
  salesTypeList:any;
  recordPaymentList:any;
  jobSK: any;
  technicianList: any = [];
  customerID?: any;
  isPayment = false;

  get jobinfo(): any {
    return this.jobForm.get(["JobInfo"]);
  }

  get productPayment(): any {
    return this.jobForm.get(["ProductPayment"]);
  }

  constructor(private router: Router, private fb: FormBuilder, private auth: AuthService, private deactGuard: DeactivateGuard, public datepipe: DatePipe) { 
    //@ts-ignore
    API.get("LehighCRMApi", "/items/listSalesType").then((response) => {
      this.salesTypeList = response.Items
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listRecordPayment").then((response) => {
      this.recordPaymentList = response.Items
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listTechnician").then((response) => {
      response.Items.forEach((v:any) => {
        if(v.isActive == true) {
          this.technicianList.push(v)
        }
      })
    })

    if (this.router.getCurrentNavigation()?.extras!.state) {
      this.jobInfo = this.router.getCurrentNavigation()?.extras!.state!["data"]["job"];
      this.customerID = this.router.getCurrentNavigation()?.extras!.state!["data"]["customer"]
      
      localStorage.setItem("read-job", JSON.stringify(this.jobInfo));
      localStorage.setItem("read-customer", JSON.stringify(this.customerID));
      this.jobInfo!.JobData.InvoiceID = '';
    } else {
      this.jobInfo = JSON.parse(localStorage.getItem("read-job")!);
      this.customerID = JSON.parse(localStorage.getItem("read-customer")!);
      
    }
    
    const getCustomer = async (id: string) => {
      // @ts-ignore
      const data = await API.get("LehighCRMApi", "/items/" + encodeURIComponent(id));
      data.Items[0].CustomerData.AddressData.forEach((v:any) => {
        const address = v.address1 + ' ' + v.city + ', ' + v.state + ' ' + v.postalCode
        this.addressArray.push(address)
      })  
      this.CustomerData = data.Items[0];
    };
    getCustomer(this.customerID!)

    this.checkForm = new FormControl();
    this.checkForm.setValue(this.jobInfo?.JobData.discountType);

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
      }
      else{
        this.totalAmount = (this.totalAmount - this.jobForm.getRawValue().discount).toFixed(2);
      }
    });
    
    let dateTime = new Date()
    let latest_date =this.datepipe.transform(dateTime, 'yyyy-MM-dd');

    this.jobForm = this.fb.group({
      JobInfo: this.fb.group({
        company: [this.jobInfo?.JobData.JobInfo.company],
        salesType: [this.jobInfo?.JobData.JobInfo.salesType],
        technician: [""],
        primaryAgent: [this.jobInfo?.JobData.JobInfo.primaryAgent],
        secondaryAgent: [this.jobInfo?.JobData.JobInfo.secondaryAgent],
        jobDate: [latest_date]
      }),
      ProductPayment: this.fb.array([
        this.fb.group({
          lineItem: [null, Validators.required],
          rate: [0, Validators.required],
          quantity: [0, Validators.required]
        })
      ]),
      Description: [this.jobInfo?.JobData.Description],
      paymentType: [""],
      paymentStatus: [""],
      paymentStatusType: ["UNPAID"],
      totalAmount: [Number(this.jobInfo?.JobData.totalAmount)],
      markUp: [Number(this.jobInfo?.JobData.markUp)],
      discount: [Number(this.jobInfo?.JobData.discount)],
      labourCost: [Number(this.jobInfo?.JobData.labourCost)],
      attachment: [""],
      jobAddress: [this.jobInfo?.JobData.jobAddress],
      jobPhone: [this.jobInfo?.JobData.jobPhone],
      lineItemNotes: [""],
      paymentFirstName: [this.jobInfo?.JobData.paymentFirstName],
      paymentLastName: [this.jobInfo?.JobData.paymentLastName],
      paymentEmail: [this.jobInfo?.JobData.paymentEmail],
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

    this.jobForm.valueChanges.subscribe((v:any) => {
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

      }else{
        this.totalAmount = (this.totalAmount - this.jobForm.getRawValue().discount).toFixed(2);
      } 
    })

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
    this.jobstatus = undefined;

    this.routerSubscription = this.router.events
      .pipe(filter((value) => value instanceof NavigationStart))
      .subscribe((value1) => {
        if (this.jobstatus) {
          this.deactGuard.canDeact = true;
        } else {
          const res = confirm("Are you sure you want to leave this page?");
          if (!res) {
            this.deactGuard.canDeact = false;
          } else {
            this.deactGuard.canDeact = true;
          }
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

      this.jobForm.controls['paymentStatusType'].disable();
      if(this.jobForm.controls['paymentStatus'].value == true){
        this.jobForm.controls['paymentStatusType'].enable();
      }

    this.auth.getAgent().then((value) => (this.authAgentName = value.attributes.name));
    this.productPayment.clear();
    this.jobInfo?.JobData.ProductPayment.forEach((v) => {
        const propay = this.jobForm.controls["ProductPayment"] as FormArray;
        propay.push(this.fb.group({
            lineItem: [v.lineItem],
            rate: [Number(v.rate)],
            quantity: [Number(v.quantity)]
          }))
    })

    //@ts-ignore
    API.get('LehighCRMApi', '/items/listjobid').then((value) => {
      this.jobID = value.Items[0].JobID
    });
  }

  get f1() { return this.cardForm.controls; }

  ngOnDestroy(): void{
    this.routerSubscription?.unsubscribe();
    localStorage.removeItem("jobCreation");
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

  submitJob() {
    this.zip();

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
      return;
    }

    const createJob = async () => {
      if(this.invoiceCreated == true) {
        this.InvoiceID = '_PO_' + this.jobID.toString() + '.pdf'
      }
      else {
        this.InvoiceID = ""
      }

      let PK = 'customer#' + this.CustomerData!.CustomerData.customerID
      let dabody: IJob = <IJob>{
        PK: encodeURIComponent(PK),
        JobData: {
          ...jobData,
          leadName: `${this.CustomerData!.CustomerData.firstName} ${this.CustomerData!.CustomerData.lastName}`,
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
        this.router.navigate(["home", "dashboard"]);
      }
      else {
        Swal.fire('Job Not Saved!', '', 'warning')
        const SaveButton = document.getElementById("SaveButton") as HTMLButtonElement | null;
        SaveButton!.disabled = false;
      }
      modal?.hide();
    };
    
    createJob();
  }

  openModal() {
    this.submitted = true;
    if (this.jobForm.invalid) {
      return;
    }
    Swal.fire({
      title: 'Are you sure you want to submit this job?',
      icon: 'info',
      background: '#F7FCFF',
      showDenyButton: true,
      confirmButtonText: 'Yes',
      confirmButtonColor: '#1B428C',
      denyButtonColor: 'grey',
      denyButtonText: `Cancel`,
    }).then((result)=>{
      if(result.isConfirmed){
        this.submitJob();
        // Swal.fire('Job Saved!', '', 'success')
      }else{
        // Swal.fire('Job Not Saved!', '', 'warning');
      }
    })
    // let modal = new Modal(document.getElementById("staticBackdropSubmit")!);
    // modal?.toggle();
    // modal?.show();
  }

  openModal2(){
    let modal = new Modal(document.getElementById("exampleModal")!);
    modal?.toggle();
    modal?.show();
  }

  closeModal(){
    let modal = new Modal(document.getElementById("exampleModal")!);
    modal?.hide()
    
    let Accord = document.getElementById("CFour")!;
    Accord.click();
  }

  closeChequeModal() {
    let btn = document.getElementById("close-cheque-modal")
    btn?.click();
    
    let Accord = document.getElementById("CFour")!;
    Accord.click();
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

  Cancel() {
    this.router.navigate(["home/dashboard"]);
  }

  addJobToCalendar() {
    const extra: NavigationExtras = {
      state: { data: {
        ...this.jobForm.getRawValue(),
        leadName: `${this.CustomerData!.CustomerData.firstName} ${this.CustomerData!.CustomerData.lastName}`,
        JobID: this.jobID,
        total: this.totalAmount,
        jobSK: this.jobSK
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


