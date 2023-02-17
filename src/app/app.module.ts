import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CustomerComponent } from './customer/customer.component';
import { JobComponent } from './job/job.component';
import { ListJobComponent } from './list-job/list-job.component';
import { ListCustomerComponent } from './list-customer/list-customer.component';
import { ReadCustomerComponent } from './read-customer/read-customer.component';
import { ReadJobComponent } from './read-job/read-job.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { TopnavComponent } from './topnav/topnav.component';
import { HomeComponent } from './home/home.component';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgxDropzoneModule } from 'ngx-dropzone';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { CalendarComponent } from './calendar/calendar.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { filter, Subject, Subscription, interval } from "rxjs";
import { HttpClientModule } from '@angular/common/http';
import { DeactivateGuard } from "./deactivate.guard";
import { ReportingComponent } from './reporting/reporting.component';
import { AdminPortalComponent } from './admin-portal/admin-portal.component';
import { DuplicateJobComponent } from './duplicate-job/duplicate-job.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    CustomerComponent,
    JobComponent,
    ListJobComponent,
    ListCustomerComponent,
    ReadCustomerComponent,
    ReadJobComponent,
    SidenavComponent,
    TopnavComponent,
    HomeComponent,
    CalendarComponent,
    ReportingComponent,
    AdminPortalComponent,
    DuplicateJobComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgxDropzoneModule,
    AmplifyAuthenticatorModule,
    BrowserAnimationsModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    NgbModalModule,
    HttpClientModule
  ],
  providers: [DeactivateGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }
