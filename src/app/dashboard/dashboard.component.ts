import { Component, OnInit } from '@angular/core';
import { API } from 'aws-amplify';
import { IJob } from 'src/interfaces/ijob';
import { animate, keyframes, state, style, transition, trigger } from "@angular/animations";
import { FormControl } from '@angular/forms';
import { NavigationExtras, Router, } from "@angular/router";
import { AnyARecord } from 'dns';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
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
export class DashboardComponent implements OnInit {

  companiesList:any = [];

  constructor(public router: Router) {
    //@ts-ignore
    API.get("LehighCRMApi", "/items/listCompanies").then((response) => {
      response.Items.forEach((v:any) => {
        if(v.isActive == true) {
          this.companiesList.push(v)
        }
      })
    })
   }
   
  completedJobs?: IJob[];
  pendingJobs?: IJob[];
  quoteJobs?: IJob[];
  tempcompletedJobs?: IJob[];
  temppendingJobs?: IJob[];
  tempquoteJobs?: IJob[];

  lenComp: any;
  lenPen: any;
  lenQuo: any;

  amoPen = 0;
  amoQuo = 0;

  totalAmount?: string | null;
  companyName = new FormControl("");
  filterDays = new FormControl("7");

  ngOnInit(): void {
    //@ts-ignore
    API.get('LehighCRMApi', '/items/jobStatus').then((value) => {
      this.completedJobs = value.completedJobs;
      this.pendingJobs = value.pendingJobs;
      this.quoteJobs = value.quoteJobs;
      this.tempcompletedJobs = value.completedJobs;
      this.temppendingJobs = value.pendingJobs;
      this.tempquoteJobs = value.quoteJobs;

      this.lenComp = this.completedJobs?.length
      this.lenPen = this.pendingJobs?.length
      this.lenQuo = this.quoteJobs?.length

      this.pendingJobs?.forEach((v:any) => {
        this.amoPen += Number(v.JobData.total)
      })
      this.quoteJobs?.forEach((v:any) => {
        this.amoQuo += Number(v.JobData.total)
      })
    })
  }

  searchByCompany() {
    this.completedJobs = []
    this.pendingJobs = []

    if (this.companyName.value == "") {
      this.completedJobs = this.tempcompletedJobs;
      this.pendingJobs = this.temppendingJobs;
      this.quoteJobs = this.tempquoteJobs;

      this.lenComp = this.completedJobs?.length
      this.lenPen = this.pendingJobs?.length
      this.lenQuo = this.quoteJobs?.length
    }
    else {
      this.completedJobs = []
      this.pendingJobs = []
      this.quoteJobs = []
      this.tempcompletedJobs?.forEach((value) => {
        if (value.JobData.JobInfo.company == this.companyName.value){
          this.completedJobs?.push(value);
        }
        this.lenComp = this.completedJobs?.length
      })
      this.temppendingJobs?.forEach((value) => {
        if (value.JobData.JobInfo.company == this.companyName.value){
          this.pendingJobs?.push(value);
        }
        this.lenPen = this.pendingJobs?.length
      })
      this.tempquoteJobs?.forEach((value) => {
        if (value.JobData.JobInfo.company == this.companyName.value){
          this.quoteJobs?.push(value);
        }
        this.lenQuo = this.quoteJobs?.length
      })
    }
  }

  getJob(job: any) {
    const nav: NavigationExtras = {
      state: {
        data: job
      }
    };
    this.router.navigate(["home", "readjob"], nav);
  }

  getByTime() {
    this.completedJobs = undefined
    this.tempcompletedJobs = undefined
    this.lenComp = 0
    
    //@ts-ignore
    API.put('LehighCRMApi', '/items/getjobStatus', {
      body: {
        timedelta: this.filterDays.value
      }
    }).then((value) => {
      this.completedJobs = value.completedJobs;
      this.tempcompletedJobs = value.completedJobs;
      this.lenComp = this.completedJobs?.length
    })
  }

}
