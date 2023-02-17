import { Component, OnInit } from '@angular/core';
import { Auth } from 'aws-amplify';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css']
})
export class SidenavComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
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
