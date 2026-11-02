import { EMPTY_INPUT, WEAPON_KINDS, type PlayerInput, type WeaponKind } from '../game/types';

const DIGITS: Record<string, WeaponKind> = {
  Digit1: 'rifle', Digit2: 'pistol', Digit3: 'smg', Digit4: 'shotgun',
  Digit5: 'm4', Digit6: 'sniper', Digit7: 'knife', Digit8: 'deagle',
};

export class Controls {
  active = false;
  aiming = false;
  private keys = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private fireHeld = false;
  private jump = false;
  private reload = false;
  private grenade = false;
  private interactHeld = false;
  private secondary = false;
  private crouch = false;
  private sprint = false;
  private pause = false;
  private switchWeapon: WeaponKind | null = null;
  private stickX = 0;
  private stickZ = 0;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private lookLast: { x: number; y: number } | null = null;
  private owned: WeaponKind[] = [...WEAPON_KINDS];

  constructor(private readonly canvas: HTMLCanvasElement) {
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
    addEventListener('mouseup', this.onMouseUp);
    addEventListener('mousemove', this.onMouseMove);
    addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.bindTouch();
  }

  setOwned(weapons: readonly WeaponKind[]) {
    this.owned = WEAPON_KINDS.filter((kind) => weapons.includes(kind));
  }

  clear() {
    this.lookX = this.lookY = this.stickX = this.stickZ = 0;
    this.fireHeld = false;
    this.jump = this.reload = this.grenade = this.secondary = this.pause = false;
    this.switchWeapon = null;
    this.interactHeld = false;
  }

  consume(): PlayerInput {
    const keyboardX = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const keyboardZ = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const input: PlayerInput = {
      ...EMPTY_INPUT,
      moveX: this.active ? keyboardX + this.stickX : 0,
      moveZ: this.active ? keyboardZ + this.stickZ : 0,
      lookDX: this.active ? this.lookX : 0,
      lookDY: this.active ? this.lookY : 0,
      fire: this.active && this.fireHeld,
      fireHeld: this.active && this.fireHeld,
      jump: this.active && this.jump,
      reload: this.active && this.reload,
      grenade: this.active && this.grenade,
      crouch: this.active && this.crouch,
      sprint: this.active && (this.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')),
      interact: this.active && (this.interactHeld || this.keys.has('KeyE')),
      secondaryFire: this.active && this.secondary,
      switchWeapon: this.active ? this.switchWeapon : null,
      pause: this.pause,
      aiming: this.aiming,
      inputSource: this.stickId != null || this.lookId != null ? 'touch' : 'mouse',
    };
    this.lookX = this.lookY = 0;
    this.jump = this.reload = this.grenade = this.secondary = this.pause = false;
    this.switchWeapon = null;
    return input;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button, input, a')) return;
    if (event.code === 'Escape' && !event.repeat) this.pause = true;
    if (!this.active || event.repeat) {
      this.keys.add(event.code);
      return;
    }
    this.keys.add(event.code);
    if (event.code === 'Space') this.jump = true;
    if (event.code === 'KeyR') this.reload = true;
    if (event.code === 'KeyG') this.grenade = true;
    if (event.code === 'KeyE') this.interactHeld = true;
    if (event.code === 'KeyC') this.crouch = !this.crouch;
    if (event.code === 'KeyQ') this.secondaryAction();
    const weapon = DIGITS[event.code];
    if (weapon && this.owned.includes(weapon)) this.switchWeapon = weapon;
    if (['Space', 'KeyR', 'KeyG', 'KeyE', 'KeyQ', 'KeyC'].includes(event.code) || event.code.startsWith('Digit')) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === 'KeyE') this.interactHeld = false;
  };

  private onMouseDown = (event: MouseEvent) => {
    if (!this.active) return;
    if (event.button === 0) this.fireHeld = true;
    if (event.button === 2) this.secondaryAction();
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) this.fireHeld = false;
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.active || document.pointerLockElement !== this.canvas) return;
    this.lookX += event.movementX * 0.0022;
    this.lookY -= event.movementY * 0.0022;
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.active || !this.owned.length) return;
    event.preventDefault();
    const current = this.switchWeapon ?? this.owned[0];
    const index = Math.max(0, this.owned.indexOf(current));
    const step = event.deltaY > 0 ? 1 : -1;
    this.switchWeapon = this.owned[(index + step + this.owned.length) % this.owned.length];
  };

  private secondaryAction() {
    if (this.owned.includes('knife') && this.knifeEquipped()) this.secondary = true;
    else this.aiming = !this.aiming;
  }

  private knifeEquipped() {
    return document.body.dataset.weapon === 'knife';
  }

  private bindTouch() {
    const stick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    const look = document.getElementById('look-zone');
    const bindHold = (id: string, down: () => void, up?: () => void) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        node.setPointerCapture(event.pointerId);
        down();
      });
      const end = () => up?.();
      node.addEventListener('pointerup', end);
      node.addEventListener('pointercancel', end);
    };
    bindHold('fire-button', () => { this.fireHeld = true; }, () => { this.fireHeld = false; });
    bindHold('aim-button', () => this.secondaryAction());
    bindHold('reload-button', () => { this.reload = true; });
    bindHold('jump-button', () => { this.jump = true; });
    bindHold('crouch-button', () => { this.crouch = !this.crouch; });
    bindHold('use-button', () => { this.interactHeld = true; }, () => { this.interactHeld = false; });
    bindHold('grenade-button', () => { this.grenade = true; });
    bindHold('swap-button', () => {
      if (!this.owned.length) return;
      const index = Math.max(0, this.owned.indexOf(this.switchWeapon ?? this.owned[0]));
      this.switchWeapon = this.owned[(index + 1) % this.owned.length];
    });
    stick?.addEventListener('pointerdown', (event) => {
      this.stickId = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      this.moveStick(event, stick, knob);
    });
    stick?.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.stickId) return;
      this.moveStick(event, stick, knob);
    });
    const endStick = (event: PointerEvent) => {
      if (event.pointerId !== this.stickId) return;
      this.stickId = null;
      this.stickX = this.stickZ = 0;
      if (knob) knob.style.transform = 'translate(0px, 0px)';
    };
    stick?.addEventListener('pointerup', endStick);
    stick?.addEventListener('pointercancel', endStick);
    look?.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      this.lookId = event.pointerId;
      this.lookLast = { x: event.clientX, y: event.clientY };
    });
    look?.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.lookId || !this.lookLast) return;
      this.lookX += (event.clientX - this.lookLast.x) * 0.0045;
      this.lookY -= (event.clientY - this.lookLast.y) * 0.0045;
      this.lookLast = { x: event.clientX, y: event.clientY };
    });
    const endLook = (event: PointerEvent) => {
      if (event.pointerId === this.lookId) {
        this.lookId = null;
        this.lookLast = null;
      }
    };
    look?.addEventListener('pointerup', endLook);
    look?.addEventListener('pointercancel', endLook);
  }

  private moveStick(event: PointerEvent, stick: HTMLElement, knob: HTMLElement | null) {
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const limit = rect.width * 0.32;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, limit / length);
    this.stickX = (dx * scale) / limit;
    this.stickZ = -(dy * scale) / limit;
    if (knob) knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }
}
