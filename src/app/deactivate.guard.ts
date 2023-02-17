import { Injectable } from '@angular/core';
import { CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { JobComponent } from "./job/job.component";

@Injectable({
  providedIn: 'root'
})
export class DeactivateGuard implements CanDeactivate<any> {
  
  canDeact = true;
  canDeactivate(nextState?: RouterStateSnapshot):boolean {
    if(nextState?.url=='/home/listjob'){
      return true;
    }
    return this.canDeact;
  }
}
