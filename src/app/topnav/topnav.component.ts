import { Component, OnDestroy, OnInit } from '@angular/core';
import { API, Auth } from 'aws-amplify';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from "rxjs";
import { validateAndRewriteCoreSymbol } from "@angular/compiler-cli/src/ngtsc/imports";
import { CustomerService } from 'src/services/customer.service';
import { JobService } from 'src/services/job.service';

@Component({
  selector: 'app-topnav',
  templateUrl: './topnav.component.html',
  styleUrls: ['./topnav.component.css']
})
export class TopnavComponent implements OnInit {
  sub: Subscription;
  get User(): any {
    return this._User;
  }

  private _User: any;
  leadList: string[] = [];
  search?: string[];
  searchtext: string = '';
  agentName: any;
  is_admin = false;
  eventNotification: any = [];
  notificationLength: any;

  constructor(public router: Router, private route: ActivatedRoute,private customerService: CustomerService, private jobService: JobService) {
    this.sub=this.router.events.pipe(filter((value) => value instanceof NavigationEnd)).subscribe((value: any) => {
      if (value.url == '/home/listcustomer') {
        this.searchtext='';
        // @ts-ignore
        API.get('LehighCRMApi', '/items/listCustomerNames').then((value1) => {
          localStorage.setItem('searchCustomer', JSON.stringify(value1))
          this.search = value1;
        });
      }
      else if (value.url == '/home/listjob') {
        this.searchtext='';
        // @ts-ignore
        API.get('LehighCRMApi', '/items/listJobNames').then((value1) => {
          localStorage.setItem('searchJob', JSON.stringify(value1))
          this.search = value1;
        });
      }
    });
  }

  ngOnInit(): void {
    if (localStorage.getItem('searchLead')){
      this.search = JSON.parse(localStorage.getItem('searchLead')!);
      localStorage.removeItem('searchLead')

    }
    if (localStorage.getItem('searchCustomer')){
      this.search = JSON.parse(localStorage.getItem('searchCustomer')!);
      localStorage.removeItem('searchCustomer')

    }
    if (localStorage.getItem('searchJob')){
      this.search = JSON.parse(localStorage.getItem('searchJob')!);
      localStorage.removeItem('searchJob')
    }
    Auth.currentUserInfo().then((value) => {
      console.log(value)
      this._User = value;
      this.agentName = value.attributes.name
      Auth.currentAuthenticatedUser().then((v) => {
        console.log(v)
        if ((v.signInUserSession.accessToken.payload["cognito:groups"] as Array<any>).includes("admin")){
          this.is_admin = true;
          this.eventCompleted()
        }
        else{
          this.is_admin = false;
          this.getEvents();
        }
      })
    });
  }

  getEvents() {
    //@ts-ignore
    // API.post('LehighCRMApi', '/items/eventNotification', {
    //   body: {
    //     agent: this.agentName
    //   }
    // }).then((v) => {
    //   this.eventNotification = v
    //   this.notificationLength = this.eventNotification.length
    // })
  }

  eventCompleted() {
    // API.post('LehighCRMApi', '/items/eventNotification', {
    //   body: {
    //     agent: 'admin'
    //   }
    // }).then((v) => {
    //   this.eventNotification = v
    //   this.notificationLength = this.eventNotification.length
    // })
  }

  onSearch() {
    if (this.router.url === '/home/listjob') this.jobService.filterJobs(this.searchtext);
    else if (this.router.url === '/home/listcustomer') this.customerService.filterCustomers(this.searchtext);
  }

  searchEvent(event: string) {
    if (this.router.url === '/home/listcustomer') this.customerService.filterCustomers(this.searchtext);
    else if (this.router.url === '/home/listjob') this.jobService.filterJobs(this.searchtext);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    localStorage.removeItem('searchJob')
  }

  logOut() {
    Auth.signOut()
      .then((value) => console.log(value))
      .catch((e) => console.log(e))
      .finally(() => {
        let currentUrl = this.router.url;
        location.reload();
      });
  }

}
