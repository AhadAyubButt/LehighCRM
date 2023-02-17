import { Component, OnInit } from '@angular/core';
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
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-read-job',
  templateUrl: './read-job.component.html',
  styleUrls: ['./read-job.component.css'],
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
})
export class ReadJobComponent implements OnInit {
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
  addressArray:any = [];
  salesTypeList:any;
  recordPaymentList:any;
  technicianList: any = [];
  isTech = false;
  isPayment = false;
  isOtherPayment = false;

  get jobinfo(): any {
    return this.jobForm.get(["JobInfo"]);
  }

  get productPayment(): any {
    return this.jobForm.get(["ProductPayment"]);
  }

  constructor(private router: Router, private fb: FormBuilder, private auth: AuthService, private deactGuard: DeactivateGuard) { 
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
      if (this.technicianList.some(((tech:any) => tech.Name === this.jobInfo?.JobData?.JobInfo?.technician))) {
        this.isTech = true;
      }
      else {
        this.isTech = false;
      }
    })
    
    if (this.router.getCurrentNavigation()?.extras!.state) {
      this.jobInfo = this.router.getCurrentNavigation()?.extras!.state!["data"];
      localStorage.setItem("read-job", JSON.stringify(this.jobInfo));
    } else {
      this.jobInfo = JSON.parse(localStorage.getItem("read-job")!);
    }

    const getCustomer = async (id: string) => {
      // @ts-ignore
      const data = await API.get("LehighCRMApi", "/items/" + encodeURIComponent(id));
      this.CustomerData = data.Items[0];
      this.CustomerData?.CustomerData.AddressData.forEach((v) => {
        const address = v.address1 + ' ' + v.city + ', ' + v.state + ' ' + v.postalCode
        this.addressArray.push(address)
      })  
    };
    getCustomer(this.jobInfo?.PK!)

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
    
    this.jobForm = this.fb.group({
      JobInfo: this.fb.group({
        company: [this.jobInfo?.JobData.JobInfo.company],
        salesType: [this.jobInfo?.JobData.JobInfo.salesType],
        technician: [this.jobInfo?.JobData.JobInfo.technician],
        primaryAgent: [this.jobInfo?.JobData.JobInfo.primaryAgent],
        secondaryAgent: [this.jobInfo?.JobData.JobInfo.secondaryAgent],
        jobDate: [this.jobInfo?.JobData.JobInfo.jobDate]
      }),
      ProductPayment: this.fb.array([
        this.fb.group({
          lineItem: [null, Validators.required],
          rate: [null, Validators.required],
          quantity: [null, Validators.required]
        })
      ]),
      Description: [this.jobInfo?.JobData.Description],
      paymentType: [this.jobInfo?.JobData.paymentType],
      paymentStatus: [this.jobInfo?.JobData.paymentStatus],
      paymentStatusType: [this.jobInfo?.JobData.paymentStatusType],
      totalAmount: [Number(this.jobInfo?.JobData.totalAmount)],
      markUp: [Number(this.jobInfo?.JobData.markUp)],
      discount: [Number(this.jobInfo?.JobData.discount)],
      labourCost: [Number(this.jobInfo?.JobData.labourCost)],
      attachment: [Number(this.jobInfo?.JobData.attachment)],
      jobAddress: [this.jobInfo?.JobData.jobAddress],
      jobPhone: [this.jobInfo?.JobData.jobPhone],
      lineItemNotes: [this.jobInfo?.JobData.lineItemNotes],
      paymentFirstName: [this.jobInfo?.JobData.paymentFirstName],
      paymentLastName: [this.jobInfo?.JobData.paymentLastName],
      paymentEmail: [this.jobInfo?.JobData.paymentEmail],
      paymentChequeAmount: [this.jobInfo?.JobData.paymentChequeAmount],
      paymentChequeNumber: [this.jobInfo?.JobData.paymentChequeNumber],
      paymentTransactionID: [this.jobInfo?.JobData.paymentTransactionID],
      paymentInvoiceID: [this.jobInfo?.JobData.paymentInvoiceID],
      paymentAmount: [this.jobInfo?.JobData.paymentAmount],
      paymentAmountLeft: [this.jobInfo?.JobData.paymentAmountLeft]
    });

    this.cardForm = this.fb.group({
      ccNumber: ['', [Validators.required,Validators.minLength(16),Validators.min(1111111111111111),Validators.max(9999999999999999)]],
      ccExp: [''],
      cvv: ['', [Validators.required,Validators.minLength(3),Validators.maxLength(3),Validators.min(111),Validators.max(999)]],
      postalCode:['']
    })
    
    if (this.jobInfo?.JobData.paymentStatus == 'Sales') {
      this.jobForm.controls['paymentStatus'].setValue(true)
    }
    else {
      this.jobForm.controls['paymentStatus'].setValue(false)
    }

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
        }
        else if(v == true){
          this.jobForm.controls['paymentStatusType'].enable();
        }
      });

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
      
    if((this.jobForm.controls['paymentStatusType'].value == 'PAID' || this.jobForm.controls['paymentStatusType'].value == 'PARTIALLY PAID') && (this.jobForm.controls['paymentType'].value == 'Credit Card' || this.jobForm.controls['paymentType'].value == 'Cheque')) {
      this.isPayment = true;
    }

    if((this.jobForm.controls['paymentStatusType'].value == 'PAID' || this.jobForm.controls['paymentStatusType'].value == 'PARTIALLY PAID') && (this.jobForm.controls['paymentType'].value == 'Cash' || this.jobForm.controls['paymentType'].value == 'Zelle')) {
      this.isOtherPayment = true;
    }
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
      this.attachName = '_PO_' + this.jobInfo?.JobData.JobID.toString();
      this.jobInfo!.JobData.attachment = this.attachName
      this.files.forEach((v) => {
        Storage.put("attachment/" + this.attachName + '/' + v.name, v)
      });
      setTimeout(() => {
        this.isUpload = true;
        this.loader = false;
        this.router.navigate(['/home/listjob']);
      }, 4000);
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
        rate: [null, Validators.required],
        quantity: [null, Validators.required]
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

  ArchiveJob(job: any){
    API.put('LehighCRMApi', '/items/archiveQuote', {
      body: {
        ...job
      }
    }).then((flag)=>{
      console.log(flag)
      if(flag.message = 'item archived'){
        job.ArchiveFlag = true;
      }
    })
  }

  UnArchiveJob(job: any){
    API.put('LehighCRMApi', '/items/unarchiveQuote', {
      body: {
        ...job
      }
    }).then((flag)=>{
      console.log(flag)
      if(flag.message = 'item unarchived'){
        job.ArchiveFlag = false;
      }
    })
  }

  submitJob() {
    this.zip();

    let modal = Modal.getInstance(document.getElementById("staticBackdropSubmit")!);
    this.loader = true;
    let jobData = this.jobForm.getRawValue()

    if (jobData['paymentStatus'] == "" || jobData['paymentStatus'] == false) {
      jobData['paymentStatus'] = "Quote"
    }
    else {
      jobData['paymentStatus'] = "Sales"
    }

    if (jobData['paymentStatusType'] == "PAID") {
      jobData['paymentAmount'] = jobData.totalAmount
      jobData['paymentAmountLeft'] = "0"
    }

    this.jobInfo!.JobData.ProductPayment = jobData.ProductPayment;
    this.jobInfo!.JobData.JobInfo = jobData.JobInfo;
    this.jobInfo!.JobData.Description = jobData.Description;
    this.jobInfo!.JobData.discount = jobData.discount;
    this.jobInfo!.JobData.labourCost = jobData.labourCost;
    this.jobInfo!.JobData.markUp = jobData.markUp;
    this.jobInfo!.JobData.totalAmount = jobData.totalAmount;
    this.jobInfo!.JobData.paymentStatus = jobData.paymentStatus;
    this.jobInfo!.JobData.paymentStatusType = jobData.paymentStatusType;
    this.jobInfo!.JobData.paymentType = jobData.paymentType;
    this.jobInfo!.JobData.subTotal = this.subTotal;
    this.jobInfo!.JobData.total = this.totalAmount;
    this.jobInfo!.JobData.jobAddress = jobData.jobAddress;
    this.jobInfo!.JobData.jobPhone = jobData.jobPhone;
    this.jobInfo!.JobData.lineItemNotes = jobData.lineItemNotes;
    this.jobInfo!.JobData.paymentFirstName = jobData.paymentFirstName;
    this.jobInfo!.JobData.paymentLastName = jobData.paymentLastName;
    this.jobInfo!.JobData.paymentEmail = jobData.paymentEmail;
    this.jobInfo!.JobData.paymentChequeAmount = jobData.paymentChequeAmount;
    this.jobInfo!.JobData.paymentChequeNumber = jobData.paymentChequeNumber;
    this.jobInfo!.JobData.paymentTransactionID = jobData.paymentTransactionID;
    this.jobInfo!.JobData.paymentInvoiceID = jobData.paymentInvoiceID;
    this.jobInfo!.JobData.paymentAmount = jobData.paymentAmount;
    this.jobInfo!.JobData.paymentAmountLeft = jobData.paymentAmountLeft;

    API.put('LehighCRMApi', '/items/job', {
      body: {
        ...this.jobInfo
      }
    }).then((value) => {
      if(value.message == 'item updated') {
        localStorage.removeItem('listJob');
        modal?.hide();
        this.jobstatus = value.message;
        this.loader = false;
        this.router.navigate(['/home/dashboard']);
      }
    })
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
        Swal.fire('Job Saved!', '', 'success')
      }else{
        Swal.fire('Job Not Saved!', '', 'warning');
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
    if(this.jobInfo!.JobData.InvoiceID == '' || this.jobInfo!.JobData.InvoiceID == undefined) {
      alert('No Invoice ID found')
    }
    else {
      const link = document.createElement("a");
        link.setAttribute("target", "_blank");
        link.setAttribute("href", "" + this.jobInfo?.JobData.InvoiceID);
        link.setAttribute("download", "_PO_" + this.jobInfo?.JobData.InvoiceID + ".pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
  }

  createInvoice() {

    if(this.jobInfo!.JobData.InvoiceID == '') {
      this.jobInfo!.JobData.InvoiceID = '_PO_' + this.jobInfo?.JobData.JobID.toString() + '.pdf'
    }
    
    let jobData = this.jobForm.getRawValue()
    if (jobData['paymentStatus'] == "" || jobData['paymentStatus'] == false) {
      jobData['paymentStatus'] = "Quote"
    }
    else {
      jobData['paymentStatus'] = "Sales"
    }

    if (jobData['paymentStatusType'] == "PAID") {
      jobData['paymentAmount'] = jobData.totalAmount
      jobData['paymentAmountLeft'] = "0"
    }

    this.jobInfo!.JobData.ProductPayment = jobData.ProductPayment;
    this.jobInfo!.JobData.JobInfo = jobData.JobInfo;
    this.jobInfo!.JobData.Description = jobData.Description;
    this.jobInfo!.JobData.discount = jobData.discount;
    this.jobInfo!.JobData.labourCost = jobData.labourCost;
    this.jobInfo!.JobData.markUp = jobData.markUp;
    this.jobInfo!.JobData.totalAmount = jobData.totalAmount;
    this.jobInfo!.JobData.paymentStatus = jobData.paymentStatus;
    this.jobInfo!.JobData.paymentStatusType = jobData.paymentStatusType;
    this.jobInfo!.JobData.paymentType = jobData.paymentType;
    this.jobInfo!.JobData.subTotal = this.subTotal;
    this.jobInfo!.JobData.total = this.totalAmount;
    this.jobInfo!.JobData.jobAddress = jobData.jobAddress;
    this.jobInfo!.JobData.jobPhone = jobData.jobPhone;
    this.jobInfo!.JobData.lineItemNotes = jobData.lineItemNotes;
    this.jobInfo!.JobData.paymentFirstName = jobData.paymentFirstName;
    this.jobInfo!.JobData.paymentLastName = jobData.paymentLastName;
    this.jobInfo!.JobData.paymentEmail = jobData.paymentEmail;
    this.jobInfo!.JobData.paymentChequeAmount = jobData.paymentChequeAmount;
    this.jobInfo!.JobData.paymentChequeNumber = jobData.paymentChequeNumber;
    this.jobInfo!.JobData.paymentTransactionID = jobData.paymentTransactionID;
    this.jobInfo!.JobData.paymentInvoiceID = jobData.paymentInvoiceID;
    this.jobInfo!.JobData.paymentAmount = jobData.paymentAmount;
    this.jobInfo!.JobData.paymentAmountLeft = jobData.paymentAmountLeft;

    const jb = {
      JobForm: this.jobForm.getRawValue(),
    }

    const obj = {
      "JobData": {
        "JobForm": this.jobForm.getRawValue(),
        "Total": this.totalAmount,
        "subTotal": this.subTotal,
        "discountType": this.checkForm.value,
        "JobID": this.jobInfo?.JobData.JobID.toString()
      },
      "CustomerData": this.CustomerData,
      "Agent": this.authAgentName
    }
    this.loader = true;

    API.post('LehighCRMApi', '/items/generateinvoice', {
      body: {
        ...obj
      }
    }).then((v) => {
      if (v.message == "Done") {
        this.invoiceCreated = true;
        this.loader = false;
        // this.submitJob();
        API.put('LehighCRMApi', '/items/job', {
          body: {
            ...this.jobInfo
          }
        })
      }
    })
  }

  DownloadAllFiles() {
    if(this.jobInfo?.JobData.attachment !='') {
      this.isDownload = true;
      this.attachName = '_PO_' + this.jobInfo?.JobData.JobID.toString();
      Storage.list('attachment/' + this.attachName + '/')
      .then( async (result) => {
        result.forEach(async (v)=>{
          this.key = v.key;
          const signedURL = await Storage.get(this.key, {download: true});
          this.downloadBlob(signedURL.Body, v.key);
          setTimeout(() => {
            this.isDownload = false;
          }, 5000)
        })
      })
      .catch(err => console.log(err));
    }
    else {
      Swal.fire('No File Attached!', '', 'info')
    }
  }

  openAttachmentModal() {
    if(this.jobInfo?.JobData.attachment !='') {
      let modal = new Modal(document.getElementById("AttachmentModal")!);
      modal?.toggle();
      modal?.show();
      this.attachName = '_PO_' + this.jobInfo?.JobData.JobID.toString();
      Storage.list('attachment/' + this.attachName + '/')
      .then((v) => {
        this.attachedFiles = v
      })
    }
    else {
      Swal.fire('No File Attached!', '', 'info')
    }
    
  }

  async downloadSingleAttachment(key:any) {
    const signedURL = await Storage.get(key, {download: true});
    this.downloadBlob(signedURL.Body, key);
  }

  downloadBlob(blob: any, filename: any) {
    const url = URL.createObjectURL(blob);   
    const a = document.createElement('a');   
    a.href = url;   a.download = filename || 'download';   
    const clickHandler = () => {     
        setTimeout(() => {       
        URL.revokeObjectURL(url);       
        a.removeEventListener('click', clickHandler);     
      }, 150);   
    };   
    a.addEventListener('click', clickHandler, false);   
    a.click();   
    return a;
  }

  Cancel() {
    this.router.navigate(["home/dashboard"]);
  }

  addJobToCalendar() {
    this.jobstatus = "Approve"
    const extra: NavigationExtras = {
      state: { data: {
        ...this.jobInfo?.JobData
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

  async downloadCheque(jobID:any){
    const signedURL = await Storage.get('cheque/cheque_' + this.jobInfo?.JobData.JobID.toString(), {download: true});
    this.downloadBlob(signedURL.Body, jobID);
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


