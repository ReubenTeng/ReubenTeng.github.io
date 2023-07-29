import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatButton } from "@angular/material/button";

export enum Options {
  "NONE",
  "PLUSMINUS",
  "CLICKS",
} // enum for options on giving age

@Component({
  selector: "app-age-check",
  templateUrl: "./age-check.component.html",
})
export class AgeCheckComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<AgeCheckComponent>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngOnInit(): void {}

  get option(): typeof Options {
    return Options;
  }
  selectedOption: Options = this.option.NONE;

  close() {
    this.dialogRef.close(true);
  }
}
