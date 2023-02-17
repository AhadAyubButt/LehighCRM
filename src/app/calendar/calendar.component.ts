import { Modal } from "bootstrap";
import {
    Component,
    ChangeDetectionStrategy,
    ViewChild,
    TemplateRef,
    OnInit,
  } from '@angular/core';
  import {
    startOfDay,
    endOfDay,
    subDays,
    addDays,
    endOfMonth,
    isSameDay,
    isSameMonth,
    addHours,
  } from 'date-fns';
  import { Subject } from 'rxjs';
  import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
  import {
    CalendarEvent,
    CalendarEventAction,
    CalendarEventTimesChangedEvent,
    CalendarView,
  } from 'angular-calendar';
import { FormBuilder, FormControl,AbstractControl, FormGroup } from '@angular/forms';
import { API, Auth, DataStore } from 'aws-amplify';
import { NavigationExtras, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { WeekDay, DatePipe } from "@angular/common";
import { IJob } from "src/interfaces/ijob";

  const colors: any = {
    red: {
      primary: '#ad2121',
      secondary: '#FAE3E3',
    },
    blue: {
      primary: '#1e90ff',
      secondary: '#99ccff',
    },
    yellow: {
      primary: '#e3bc08',
      secondary: '#fcec9f',
    },
  };

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  providers: [DatePipe]
})
export class CalendarComponent implements OnInit {
    listJob:any = [];
    form: FormGroup;
    eventID: any;
    submitted = false;
    loader = false;
    isAgent = false;
    fromJob = false;
    jobInfo?: any;
    jobPhoneNumber: any;
    jobAddress: any;
    lineItemNotes: any;
    ClientName: any;
    ClientPhone: any;
    ClientAddress: any;
    technicianList: any = [];

    get color(): any {
      return this.form.get(["color"]);
    }

    @ViewChild('modalContent', { static: true }) modalContent!: TemplateRef<any>;
  
    view: CalendarView = CalendarView.Week;
  
    CalendarView = CalendarView;
    viewDate: Date = new Date();
  
    modalData!: {
      action: string;
      event: CalendarEvent;
    };
  
    actions: CalendarEventAction[] = [
      {
        label: '<i class="fas fa-fw fa-pencil-alt"></i>',
        a11yLabel: 'Edit',
        onClick: ({ event }: { event: CalendarEvent }): void => {
          this.handleEvent('Edited', event);
        },
      },
      {
        label: '<i class="fas fa-fw fa-trash-alt"></i>',
        a11yLabel: 'Delete',
        onClick: ({ event }: { event: CalendarEvent }): void => {
          this.events = this.events.filter((iEvent) => iEvent !== event);
          this.handleEvent('Deleted', event);
        },
      },
    ];
  
    refresh = new Subject<void>();
  
    events: CalendarEvent[] = [];
    NewEvents: CalendarEvent[] = [];
    popupevents: CalendarEvent[] = [];
    
    activeDayIsOpen: boolean = false;

  constructor(private modal: NgbModal, private fb: FormBuilder, private router: Router, public datepipe: DatePipe) {

    this.form = this.fb.group({
      color: [''],
      start: [''],
      checkForm: [''],
      end: [''],
      title: [''],
      description: [''],
      notes: [''],
      phone: [''],
      address: [''],
      agent: [''],
      allDay: null,
      draggable: null,
      firstName: [''],
      lastName: [''],
      total: [''],
      jobID: [''],
      jobSK: ['']
    });

    if (this.router.getCurrentNavigation()?.extras!.state) {
      this.jobInfo = this.router.getCurrentNavigation()?.extras!.state!["data"];
      this.fromJob = true;

      this.form.controls['firstName'].setValue(this.jobInfo.paymentFirstName);
      this.form.controls['lastName'].setValue(this.jobInfo.paymentLastName);
      this.form.controls['total'].setValue(this.jobInfo.total);
      this.form.controls['jobID'].setValue(this.jobInfo.JobID);
      this.form.controls['jobSK'].setValue(this.jobInfo.SK);

    }

    // @ts-ignore
    API.get('LehighCRMApi', '/items/listEvent').then((v2) => {
      v2.Items.forEach((value:any) => {
        const startDate = new Date(value.EventData.start)
        const endDate = new Date(value.EventData.end)
        value.EventData.start = startDate
        value.EventData.end = endDate
        this.events.push(value.EventData)
        this.NewEvents.push(value.EventData);
      })
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listJob").then((v) => {
      v.Items.forEach((val:any) => {
        if(val.JobData.paymentStatusType == "UNPAID" || val.JobData.paymentStatusType == "") {
          this.listJob.push(val)
        }
      })
    })

    //@ts-ignore
    API.get("LehighCRMApi", "/items/listTechnician").then((response) => {
      response.Items.forEach((v:any) => {
        this.technicianList.push(v)
      })
    })

  }

  ngOnInit(): void {
    if (this.fromJob == true) {
      let desc = ''
      let date = this.datepipe.transform(this.viewDate, 'yyyy-MM-ddTHH:mm')
      this.form.controls['start'].setValue(date);
      this.form.controls['end'].setValue(date);
      this.form.controls['agent'].setValue(this.jobInfo!.JobInfo.technician);
      this.form.controls['title'].setValue(this.jobInfo.leadName + ' - Job # ' + this.jobInfo.JobID);
      this.form.controls['phone'].setValue(this.jobInfo!.jobPhone);
      this.form.controls['address'].setValue(this.jobInfo!.jobAddress);
      this.jobPhoneNumber = this.jobInfo!.jobPhone;
      this.jobAddress = this.jobInfo!.jobAddress;
      this.lineItemNotes = this.jobInfo!.lineItemNotes;

      this.jobInfo.ProductPayment.forEach((v:any) => {
        desc += '• Item: ' + v.lineItem + '\n'
      })
      this.form.controls['description'].setValue(desc);

      this.events!.forEach((v) => {
        if(v.agent == this.jobInfo!.JobInfo.technician) {
          this.popupevents.push(v)
        }
      });

      // @ts-ignore
      API.get('LehighCRMApi', '/items/listEvent').then((v2) => {
        v2.Items.forEach((value:any) => {
          if(value.EventData.agent == this.jobInfo!.JobInfo.technician) {
            const startDate = new Date(value.EventData.start)
            const endDate = new Date(value.EventData.end)
            value.EventData.start = startDate
            value.EventData.end = endDate
            this.popupevents.push(value.EventData)
          }
        })
      })
      
      let modal2 = new Modal(document.getElementById('staticBackdrop')!);
      modal2.show();
      
    }
  }

  get f(): { [key: string]: AbstractControl }
  {
    return this.form.controls;
  }
  get f1() {
    return this.form;
  }

  onChange(value: any){
    this.NewEvents = [];
    this.events!.forEach((v) => {
      if(v.agent == value) {
        this.NewEvents.push(v)
      }
      else if(value == ""){
        this.NewEvents = this.events;
      }
    });
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === false) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = false;
      }
      this.viewDate = date;
    }
  }

  hourSegmentClicked(events: Date) {
    let date = this.datepipe.transform(events, 'yyyy-MM-ddTHH:mm')
    this.form.controls['start'].setValue(date);
    let modal = new Modal(document.getElementById('staticBackdropJob')!);
    modal.show();
  }

  hourSegmentClickedPopup(events: Date) {
    let date = this.datepipe.transform(events, 'yyyy-MM-ddTHH:mm')
    this.form.controls['start'].setValue(date);
    this.form.controls['end'].setValue(date);

  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd,
        };
      }
      return iEvent;
    });
    this.handleEvent('Dropped or resized', event);
  }

  handleEvent(action: string, event: CalendarEvent): void {
    let startdate = this.datepipe.transform(event.start, 'yyyy-MM-ddTHH:mm');
    let enddate = this.datepipe.transform(event.end, 'yyyy-MM-ddTHH:mm');
    this.modalData = { event, action };
    this.modal.open(this.modalContent, { size: 'lg' });
    this.eventID = event.id
    this.form.controls['title'].setValue(event.title)
    this.form.controls['description'].setValue(event.description)
    this.form.controls['agent'].setValue(event.agent)
    this.ClientPhone = event.phone;
    this.ClientAddress = event.address;
    this.ClientName = event.title;
    this.form.controls['notes'].setValue(event.notes)
    this.form.controls['start'].setValue(startdate)
    this.form.controls['end'].setValue(enddate)
    this.form.controls['checkForm'].setValue(event.checkForm)
    this.form.controls['color'].setValue(event.color)
  }
  
  clear() {
    this.form.reset();
    this.popupevents = []
  }

  disable() {
    const extra: NavigationExtras = {
      state: { data: this.form.getRawValue() }
    };
    this.router.navigate(["home", "calender"]);
  }

  updateEvent() {
    const data = this.form.getRawValue()
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    //show loader
    this.loader = true;

    API.put('LehighCRMApi','/items/updateEvent', {
      body: {
        PK: this.eventID,
        EventData: data,
        IS_TOUCHED: 'False'
      } 
    }).then((v) => {       
     if (v.message=='event updated') {
      window.location.reload();
    }
    })
  }

  deleteEvent() {
    API.post('LehighCRMApi', '/items/deleteEvent', {
      body: {
        PK: this.eventID
      }
      
    }).then((v) => {
      if(v.message == 'event deleted'){
        window.location.reload();
      }
    })

  }

  setView(view: CalendarView) {
    this.view = view;
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }

  navigateNewCustomer(){
    let modal = new Modal(document.getElementById('staticBackdropJob')!);
    modal.hide();
    this.router.navigate(["home", "listcustomer"]);
  }

  getJob(job: any) {
    let CloseButton = document.getElementById("closeModal");
    CloseButton?.click();

    let desc = ''
    let startDate = this.datepipe.transform(job.JobData.JobInfo.jobDate, 'yyyy-MM-ddTHH:mm')
    let endDate = this.datepipe.transform(job.JobData.JobInfo.jobDate, 'yyyy-MM-ddTHH:mm')
    this.form.controls['start'].setValue(startDate);
    this.form.controls['end'].setValue(endDate);
    this.form.controls['agent'].setValue(job.JobData.JobInfo.technician);
    this.jobPhoneNumber = job.JobData!.jobPhone;
    this.jobAddress = job.JobData!.jobAddress;
    this.form.controls['title'].setValue(job.JobData.leadName + ' - Job # ' + job.JobData.JobID);
    this.form.controls['phone'].setValue(job.JobData.jobPhone);
    this.form.controls['address'].setValue(job.JobData.jobAddress);
    this.form.controls['firstName'].setValue(job.JobData.leadName.split(" ")[0]);
    this.form.controls['lastName'].setValue(job.JobData.leadName.split(" ")[1]);
    this.form.controls['total'].setValue(job.JobData.total);
    this.form.controls['jobID'].setValue(job.JobData.JobID);
    this.form.controls['jobSK'].setValue(job.SK);


    job.JobData.ProductPayment.forEach((v:any) => {
      desc += '• Item: ' + v.lineItem + '\n'
    })
    this.form.controls['description'].setValue(desc);

    // @ts-ignore
    API.get('LehighCRMApi', '/items/listEvent').then((v2) => {
      v2.Items.forEach((value:any) => {
        if(value.EventData.agent == job.JobData.JobInfo.technician) {
          const startDate = new Date(value.EventData.start)
          const endDate = new Date(value.EventData.end)
          value.EventData.start = startDate
          value.EventData.end = endDate
          this.popupevents.push(value.EventData)
        }
      })
    })

    let modal = new Modal(document.getElementById('staticBackdropTime')!);
    modal.show();
    
  }

  saveEvent() {
    const fValue = this.form.getRawValue()
    fValue.checkForm = false;
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    //show loader
    this.loader = true;

    if(fValue.agent == "Dylan Pepper"){
      fValue.color = colors.yellow
      API.post('LehighCRMApi', '/items/createEvent', {
        body: {
          EventData: fValue
        }
      }).then((v) => {
        if(v == 'event created'){
          window.location.reload()
        }
      })
    }
    if(fValue.agent == "Waqas Ahmad"){
      fValue.color = colors.blue
      API.post('LehighCRMApi', '/items/createEvent', {
        body: {
          EventData: fValue
        }
      }).then((v) => {
        if(v == 'event created'){
          window.location.reload()
        }
      })
    }
    else {
      //@ts-ignore
      API.get("LehighCRMApi", '/items/listTechnician').then((v) => {
        v.Items.forEach((val:any) => {
          if(fValue.agent == val.Name) {
            fValue.color = val.color
            API.post('LehighCRMApi', '/items/createEvent', {
              body: {
                EventData: fValue
              }
            }).then((v) => {
              if(v == 'event created'){
                window.location.reload()
              }
            })
          }
        })
      })
    }
  }

  ngOnDestroy() {
    this.listJob = []
  }

}