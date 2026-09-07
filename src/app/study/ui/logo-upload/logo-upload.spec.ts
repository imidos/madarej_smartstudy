import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LogoUpload } from './logo-upload';
import { StudyStore } from '../../study-store';
import { Logo } from '../../study-model';

describe('Logo upload', () => {
  const logo = signal<Logo | undefined>(undefined);
  let component: LogoUpload;
  const decode = vi.fn();
  beforeEach(() => {
    logo.set(undefined);
    decode.mockReset();
    decode.mockResolvedValue(undefined);
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        naturalWidth = 32;
        naturalHeight = 32;
        decode = decode;
      },
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test-logo'),
      revokeObjectURL: vi.fn(),
    });
    TestBed.configureTestingModule({
      imports: [LogoUpload],
      providers: [{ provide: StudyStore, useValue: { logo } }],
    });
    component = TestBed.createComponent(LogoUpload).componentInstance;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  function choose(file: File): Promise<void> {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    return component.choose({ target: input } as unknown as Event);
  }
  it('accepts a decoded image and replaces the previous logo', async () => {
    await choose(new File(['png'], 'first.png', { type: 'image/png' }));
    expect(logo()?.name).toBe('first.png');
    await choose(new File(['webp'], 'second.webp', { type: 'image/webp' }));
    expect(logo()?.name).toBe('second.webp');
    expect(component.error()).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it('rejects unsupported, empty and oversized files before decoding', async () => {
    for (const file of [
      new File(['svg'], 'x.svg', { type: 'image/svg+xml' }),
      new File([], 'x.png', { type: 'image/png' }),
      new File([new Uint8Array(2097153)], 'x.png', { type: 'image/png' }),
    ]) {
      await choose(file);
      expect(component.error()).not.toBe('');
      expect(logo()).toBeUndefined();
    }
    expect(decode).not.toHaveBeenCalled();
  });
  it('keeps the previous logo when decoding fails', async () => {
    await choose(new File(['png'], 'first.png', { type: 'image/png' }));
    decode.mockRejectedValue(new Error('bad-image'));
    await choose(new File(['bad'], 'bad.png', { type: 'image/png' }));
    expect(logo()?.name).toBe('first.png');
    expect(component.error()).not.toBe('');
    expect(component.processing()).toBe(false);
  });
});
