import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AgeCheckComponent } from "./age-check/age-check.component";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-landing",
  templateUrl: "./landing.component.html",
})
export class LandingComponent implements OnInit {
  constructor(public dialog: MatDialog) {}

  isAgeGiven = false;
  buttonText = "\n";

  ngOnInit(): void {}

  openContinueDialog() {
    const dialogRef = this.dialog.open(AgeCheckComponent, {
      data: this.isAgeGiven,
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.isAgeGiven = result;
      this.log(result);
    });
  }

  log(value) {
    console.log(value);
  }

  close(value) {
    this.isAgeGiven = value;
    this.dialog.closeAll();
  }
}
