import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

class Box {
  public number: number;
  private XMAX = 480 - 27;
  private XMIN = 0;
  private YMAX = 280 - 27;
  private YMIN = 0;
  private Xvelocity: number;
  private Yvelocity: number;
  private XPos: number;
  private YPos: number;
  private numColor: string;
  private bubbleColor: string;
  constructor(number: number) {
    this.number = number;
    // Random number from 2 to 5;
    this.Xvelocity = Math.random() * 3 + 2;
    this.Yvelocity = Math.random() * 3 + 2;

    // 50% chance for X and Y velocity being negative
    if (Math.random() > 0.5) {
      this.Xvelocity = -this.Xvelocity;
    }
    if (Math.random() > 0.5) {
      this.Yvelocity = -this.Yvelocity;
    }
    // Random number from 0 to 480
    this.XPos = Math.random() * 480;
    // Random number from 0 to 280
    this.YPos = Math.random() * 280;
  }

  public update() {
    this.XPos += this.Xvelocity;
    this.YPos += this.Yvelocity;
    if (this.XPos >= this.XMAX || this.XPos <= this.XMIN) {
      this.Xvelocity = -this.Xvelocity;
      this.XPos = this.XPos >= this.XMAX ? this.XMAX : this.XMIN; // set XPos to the boundary that it intersected
    }
    if (this.YPos >= this.YMAX || this.YPos <= this.YMIN) {
      this.Yvelocity = -this.Yvelocity;
      this.YPos = this.YPos >= this.YMAX ? this.YMAX : this.YMIN; // set XPos to the boundary that it intersected
    }
  }

  public speedUp() {
    this.Xvelocity *= 2;
    this.Yvelocity *= 2;
  }

  public slowDown() {
    this.Xvelocity *= 0.99;
    this.Yvelocity *= 0.99;
  }
}

const BOXES = [
  new Box(1),
  new Box(2),
  new Box(3),
  new Box(4),
  new Box(5),
  new Box(6),
  new Box(7),
  new Box(8),
  new Box(9),
  new Box(0),
];

@Component({
  selector: "app-clicks",
  templateUrl: "./clicks.component.html",
  styleUrls: ["./clicks.component.css"],
})
export class ClicksComponent implements OnInit {
  year = "";

  constructor(public dialogRef: MatDialogRef<ClicksComponent>) {}

  ngOnInit(): void {
    setInterval(this.callUpdate, 33.3); // update at 30Hz
  }

  callUpdate() {
    BOXES.forEach((box) => box.update());
  }

  getBoxes() {
    return BOXES;
  }

  onClickBox(num: number) {
    this.year += num;
    BOXES.forEach((box) => box.speedUp());
  }

  onClickSlowDown() {
    BOXES.forEach((box) => box.slowDown());
    alert(
      "Number speed has been decreased by a factor of 0.01! Hope this helps you click the correct number."
    );
  }

  onClickDelete() {
    this.year = this.year.slice(1);
  }

  close() {
    this.dialogRef.close(true);
  }
}
