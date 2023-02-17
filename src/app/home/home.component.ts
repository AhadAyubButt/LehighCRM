import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor() {
    document.getElementById('containerDiv')!.style.background = "none";
    document.getElementById('loginBanner')!.style.background = "none";
    document.getElementById('loginBanner')!.style.display = "none";
    document.getElementById('loginBanner')!.className = "";
    document.getElementById('main-banner-area')!.className = "col-lg-12";
    document.getElementById('main-banner-area')!.style.border = "none";
    // document.getElementById('login-row')!.style.display = "none";
  }

  ngOnInit(): void {
  }

}
