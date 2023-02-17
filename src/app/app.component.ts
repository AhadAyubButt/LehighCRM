import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'LehighCRM';

  ngOnInit() {
    window.addEventListener('beforeunload', (ev)=>{
      ev.defaultPrevented;
      localStorage.removeItem("listJob");
      localStorage.removeItem("listCustomers");
    })

  }
}


