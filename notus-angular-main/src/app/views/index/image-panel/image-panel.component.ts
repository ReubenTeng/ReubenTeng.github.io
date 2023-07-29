import { Component, Input, OnInit } from "@angular/core";

// import * as Path from "path";
// import * as fs from "fs";
@Component({
  selector: "app-image-panel",
  templateUrl: "./image-panel.component.html",
})
export class ImagePanelComponent implements OnInit {
  @Input() name: string;
  @Input() image_dir: string;
  images: string[] = [];
  constructor() {}

  ngOnInit(): void {
    // get all images from the image_dir
    // const dir = Path.join("assets/img/profile_images", this.image_dir);
  }
}
