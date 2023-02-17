import { Component, OnInit } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IJob } from 'src/interfaces/ijob';
import { JobService } from "src/services/job.service";
import { animate, keyframes, state, style, transition, trigger } from "@angular/animations";
import { API } from 'aws-amplify';
import Swal from 'sweetalert2';
import { FormControl } from '@angular/forms';
import { ICustomer } from 'src/interfaces/icustomer';
import { CustomerService } from 'src/services/customer.service';

@Component({
  selector: 'app-list-job',
  templateUrl: './list-job.component.html',
  styleUrls: ['./list-job.component.css'],
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
export class ListJobComponent implements OnInit {

  listJob?: IJob[];
  private sub!: Subscription;

  public check: boolean = false;
  TempListJobs?: IJob[]
  ListCustomer? : ICustomer[];

  FilterJobs = new FormControl();
  dupJob: any;

  constructor(private jobService: JobService, private router: Router, private customerService: CustomerService) { 
    this.sub = this.jobService.filterJobData.subscribe((value) => {
      this.listJob = value;
      this.TempListJobs = value;
      localStorage.setItem("listJob", JSON.stringify(value))
    });
    this.sub = this.customerService.filterCustomerData.subscribe(value => {
      this.ListCustomer = value;
      localStorage.setItem("listCustomers", JSON.stringify(value));
    });

    this.FilterJobs.setValue('All');
  }

  ngOnInit(): void {
    this.listJob = undefined;
    this.ListCustomer = undefined;
    if (JSON.parse(localStorage.getItem("listJob")!) != undefined) {
      this.listJob = JSON.parse(localStorage.getItem("listJob")!);
      this.TempListJobs = JSON.parse(localStorage.getItem("listJob")!);
    } else {
      this.jobService.listAllJobs();
    }

    if (JSON.parse(localStorage.getItem("listCustomers")!) != undefined) {
      this.ListCustomer = JSON.parse(localStorage.getItem("listCustomers")!)
    } else {
      this.customerService.listAllCustomers();
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.listJob = []
  }

  getJob(job:any) {
    const nav: NavigationExtras = {
      state: {
        data: job
      }
    };
    this.router.navigate(["home", "readjob"], nav);
  }

  ArchiveJob(job: any){
    API.put('LehighCRMApi', '/items/archiveQuote', {
      body: {
        ...job
      }
    }).then((flag)=>{
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
      if(flag.message = 'item unarchived'){
        job.ArchiveFlag = false;
      }
    })
  }

  FilterJobsByType(){
    this.TempListJobs = [];
    this.listJob?.forEach((job)=>{
      if(job.JobData.paymentStatus == this.FilterJobs.value){
        this.TempListJobs?.push(job);
      }
      else if(this.FilterJobs.value == 'All'){
        this.TempListJobs = this.listJob;
      }
    });
  }

  deleteJob(job:any) {
    Swal.fire({
      title: 'Do you want to delete this job?',
      showDenyButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: 'maroon',
      denyButtonColor: 'grey',
      denyButtonText: `Cancel`,
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Deleted Successfully!', '', 'success')
        API.put("LehighCRMApi", "/items/deleteJob", {
          body: {
            ...job
          }
        }).then((val:any) => {
          if(val.message == "job deleted") {
            window.location.reload();
          }
        })
      } else if (result.isDenied) {
        Swal.fire('Job not deleted!', '', 'info')
      }
    });
  }

  navigateNewCustomer(){
    this.router.navigate(["home", "customer"]);
  }

  navigateExistingCustomer(){
    this.router.navigate(["home", "listcustomer"]);
  }

  duplicateJob(customer:any) {
    let btn = document.getElementById("closeModal")
    btn?.click();
    const nav: NavigationExtras = {
      state: {
        data: {
          "customer": customer.PK,
          "job": this.dupJob
        }
      }
    };
    this.router.navigate(["home", "duplicatejob"], nav);
  }

  dupJobBtn(job:any) {
    this.dupJob = job;
  }

}
