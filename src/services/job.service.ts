import { Injectable } from '@angular/core';
import { IJob } from 'src/interfaces/ijob';
import { API } from 'aws-amplify';
import { Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class JobService {

  listJobs: IJob[] = [];
  filterJobData: Subject<IJob[]> = new Subject<IJob[]>();

  constructor() { }

  listAllJobs() {
    // @ts-ignore
    API.get("LehighCRMApi", "/items/listJob").then((value) => {
      if (value.Items) {
        this.listJobs = value.Items;
        this.filterJobData.next(value.Items);
      }
    });
  };

  filterJobs(filterString: string) {
    if (filterString) {
      filterString = filterString.trim();
      this.filterJobData.next(
        this.listJobs.filter((value1) => {
          return (
            `${value1.JobData.leadName.toLowerCase()}`.includes(filterString) ||
            `${value1.JobData.leadName}`.includes(filterString)
          );
        })
      );
    }else {
      return this.filterJobData.next(this.listJobs);

    }
  }
}
