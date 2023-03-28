import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
})
export class FooterComponent implements OnInit {
  date = new Date().getFullYear();
  constructor() {}

  ngOnInit(): void {}

  openLink(link: string) {
    // open link in new tab
    window.open(link, "_blank");
  }
}
