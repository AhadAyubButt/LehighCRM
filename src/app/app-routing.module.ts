import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { JobComponent } from "./job/job.component";
import { ListJobComponent } from './list-job/list-job.component';
import { ReadJobComponent } from './read-job/read-job.component';
import { ListCustomerComponent } from './list-customer/list-customer.component';
import { CustomerComponent } from "./customer/customer.component";
import { ReadCustomerComponent } from './read-customer/read-customer.component';
import { CalendarComponent} from './calendar/calendar.component';
import { DeactivateGuard } from "./deactivate.guard";
import { ReportingComponent } from './reporting/reporting.component';
import { AdminPortalComponent } from './admin-portal/admin-portal.component';
import { DuplicateJobComponent } from './duplicate-job/duplicate-job.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'adminportal',
        component: AdminPortalComponent,
      },
      {
        path: "customer",
        component: CustomerComponent,
        canDeactivate: [DeactivateGuard]
      },
      {
        path: "readcustomer",
        component: ReadCustomerComponent,
        canDeactivate: [DeactivateGuard]
      },
      {
        path: 'listcustomer',
        component: ListCustomerComponent,
      },
      {
        path: "job",
        component: JobComponent,
        canDeactivate: [DeactivateGuard]
      },
      {
        path: "readjob",
        component: ReadJobComponent,
        canDeactivate: [DeactivateGuard]
      },
      {
        path: "duplicatejob",
        component: DuplicateJobComponent,
        canDeactivate: [DeactivateGuard]
      },
      {
        path: 'listjob',
        component: ListJobComponent
      },
      {
        path: 'calendar',
        component: CalendarComponent,
      },
      {
        path: 'reporting',
        component: ReportingComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
