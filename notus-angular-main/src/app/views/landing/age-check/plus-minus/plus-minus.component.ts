import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatButton } from "@angular/material/button";

enum Operation {
  "PLUS",
  "MINUS",
  "TIMES",
  "DIVIDE",
  "EQUALS",
} // enum for operations

@Component({
  selector: "app-plus-minus",
  templateUrl: "./plus-minus.component.html",
})
export class PlusMinusComponent implements OnInit {
  year = 0;
  constructor(
    public dialogRef: MatDialogRef<PlusMinusComponent>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  ngOnInit(): void {}

  get operation(): typeof Operation {
    return Operation;
  }

  yearToString(year: Number) {
    let year_str = year.toString();
    while (year_str.length < 4) {
      year_str = "0" + year_str;
    }
    return year_str;
  }

  onClickButton(operation: Operation) {
    switch (operation) {
      case Operation.PLUS:
        if (this.year < 9999) {
          this.year++;
        }
        break;
      case Operation.MINUS:
        if (this.year > 0) {
          this.year--;
        }
        break;
    }
  }

  close() {
    this.dialogRef.close(true);
  }
}
