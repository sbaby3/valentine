import { Component, signal, ElementRef, ViewChild, AfterViewInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';



@Component({
  selector: 'app-root',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, AfterViewChecked {
  showQuestion = true;
  @ViewChild('arena', { read: ElementRef }) arenaRef?: ElementRef<HTMLDivElement>;
  @ViewChild('yesBtn', { read: ElementRef }) yesBtnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('noBtn', { read: ElementRef }) noBtnRef?: ElementRef<HTMLButtonElement>;

  private initialized = false;
  private lastPointer: { clientX: number; clientY: number } | null = null;
  private yesScale = 0.5;
  private yesScaleMax = 0.5;
  private readonly yesScaleStep = 0.05;
  private lastBumpAt = 0;
  private readonly bumpCooldownMs = 180;

  ngAfterViewInit(): void {
    this.tryInit();
  }

  ngAfterViewChecked(): void {
    this.tryInit();
  }
  onYes(): void {
    this.showQuestion = false;
    
    
  }

  onArenaMove(ev: PointerEvent | MouseEvent | TouchEvent): void {
    if (!this.initialized) return;

    if (!this.arenaRef?.nativeElement || !this.noBtnRef?.nativeElement) {
      return;
    }
    const arena = this.arenaRef.nativeElement;
    const noBtn = this.noBtnRef.nativeElement;

    const arenaRect = arena.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();

    const point = this.getEventPoint(ev);
    if (!point) return;
    this.lastPointer = point;

    // Pointer position relative to the arena
    const mx = point.clientX - arenaRect.left;
    const my = point.clientY - arenaRect.top;

    // Button center relative to the arena
    const bx = (btnRect.left - arenaRect.left) + btnRect.width / 2;
    const by = (btnRect.top - arenaRect.top) + btnRect.height / 2;

    const dx = mx - bx;
    const dy = my - by;
    const dist = Math.hypot(dx, dy);

    // How close before it dodges (tweak this)
    const dangerRadius = 90;

    if (dist < dangerRadius) {
      this.randomizeNoPosition(point);
      this.bumpYesScale();
    }
  }

  onNoHover(): void {
    if (!this.initialized) return;
    this.randomizeNoPosition(this.lastPointer ?? undefined);
    this.bumpYesScale();
  }

  private getEventPoint(
    ev: PointerEvent | MouseEvent | TouchEvent
  ): { clientX: number; clientY: number } | null {
    if (ev instanceof TouchEvent) {
      const touch = ev.touches[0] ?? ev.changedTouches[0];
      return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null;
    }
    return { clientX: ev.clientX, clientY: ev.clientY };
  }

  private randomizeNoPosition(
    pointer?: { clientX: number; clientY: number }
  ): void {
    if (!this.arenaRef?.nativeElement || !this.noBtnRef?.nativeElement) {
      return;
    }
    const arena = this.arenaRef.nativeElement;
    const noBtn = this.noBtnRef.nativeElement;
    const yesBtn = this.yesBtnRef?.nativeElement;

    const arenaRect = arena.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    const yesRect = yesBtn?.getBoundingClientRect() ?? null;

    const padding = 8;

    // Center positions so the button stays fully inside
    const minX = padding + btnRect.width / 2;
    const maxX = arenaRect.width - btnRect.width / 2 - padding;
    const minY = padding + btnRect.height / 2;
    const maxY = arenaRect.height - btnRect.height / 2 - padding;

    // Random position within bounds, avoiding the pointer
    const avoidRadius = 120;
    const tries = 20;
    let x = minX;
    let y = minY;

    for (let i = 0; i < tries; i += 1) {
      x = minX + Math.random() * Math.max(0, maxX - minX);
      y = minY + Math.random() * Math.max(0, maxY - minY);

      const overlapsYes = yesRect
        ? this.rectsOverlap(
            x - btnRect.width / 2,
            y - btnRect.height / 2,
            btnRect.width,
            btnRect.height,
            yesRect.left - arenaRect.left,
            yesRect.top - arenaRect.top,
            yesRect.width,
            yesRect.height
          )
        : false;

      if (overlapsYes) continue;

      if (!pointer) break;
      const px = pointer.clientX - arenaRect.left;
      const py = pointer.clientY - arenaRect.top;
      const dist = Math.hypot(px - x, py - y);
      if (dist > avoidRadius) break;
    }

    // Position the button (absolute inside arena)
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  private tryInit(): void {
    if (this.initialized) return;
    if (
      !this.arenaRef?.nativeElement ||
      !this.noBtnRef?.nativeElement ||
      !this.yesBtnRef?.nativeElement
    ) {
      return;
    }
    this.placeButtonsCentered();
    this.computeYesScaleMax();
    this.applyYesScale();
    this.initialized = true;
  }

  private placeButtonsCentered(): void {
    if (
      !this.arenaRef?.nativeElement ||
      !this.noBtnRef?.nativeElement ||
      !this.yesBtnRef?.nativeElement
    ) {
      return;
    }
    const arena = this.arenaRef.nativeElement;
    const noBtn = this.noBtnRef.nativeElement;
    const yesBtn = this.yesBtnRef.nativeElement;

    const arenaRect = arena.getBoundingClientRect();
    const yesRect = yesBtn.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    const padding = 8;
    const gap = 16;

    const totalWidth = yesRect.width + gap + noRect.width;
    const leftEdge = (arenaRect.width - totalWidth) / 2;
    const centerY = arenaRect.height / 2;

    let yesX = leftEdge + yesRect.width / 2;
    let noX = leftEdge + yesRect.width + gap + noRect.width / 2;

    const minY = padding + Math.max(yesRect.height, noRect.height) / 2;
    const maxY = arenaRect.height - Math.max(yesRect.height, noRect.height) / 2 - padding;

    const minYesX = padding + yesRect.width / 2;
    const maxYesX = arenaRect.width - yesRect.width / 2 - padding;
    const minNoX = padding + noRect.width / 2;
    const maxNoX = arenaRect.width - noRect.width / 2 - padding;

    yesX = Math.max(minYesX, Math.min(yesX, maxYesX));
    noX = Math.max(minNoX, Math.min(noX, maxNoX));

    const y = Math.max(minY, Math.min(centerY, maxY));

    yesBtn.style.left = `${yesX}px`;
    yesBtn.style.top = `${y}px`;

    noBtn.style.left = `${noX}px`;
    noBtn.style.top = `${y}px`;
  }

  private computeYesScaleMax(): void {
    if (!this.arenaRef?.nativeElement || !this.yesBtnRef?.nativeElement) return;
    const arenaRect = this.arenaRef.nativeElement.getBoundingClientRect();
    const yesRect = this.yesBtnRef.nativeElement.getBoundingClientRect();
    if (yesRect.width === 0 || yesRect.height === 0) return;

    const baseWidth = yesRect.width / this.yesScale;
    const baseHeight = yesRect.height / this.yesScale;
    if (baseWidth === 0 || baseHeight === 0) return;

    const scaleToFit = Math.min(
      arenaRect.width / baseWidth,
      arenaRect.height / baseHeight
    );

    // Keep a little margin so it doesn't overflow the arena
    this.yesScaleMax = Math.max(this.yesScale, scaleToFit * 0.97);
  }

  private bumpYesScale(): void {
    if (!this.yesBtnRef?.nativeElement) return;
    const now = performance.now();
    if (now - this.lastBumpAt < this.bumpCooldownMs) return;
    this.lastBumpAt = now;
    const next = Math.min(this.yesScaleMax, this.yesScale + this.yesScaleStep);
    if (next === this.yesScale) return;
    this.yesScale = next;
    this.applyYesScale();
  }

  private applyYesScale(): void {
    if (!this.yesBtnRef?.nativeElement) return;
    this.yesBtnRef.nativeElement.style.transform = `translate(-50%, -50%) scale(${this.yesScale})`;
  }

  private rectsOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
}
