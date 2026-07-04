// Unit tests for the context-derived "what the production expects" tip (Kind A).
// Pure — no DOM — so it runs in the default node vitest environment.
import { describe, it, expect } from 'vitest';
import { expectationHtml, normTip } from './tip.js';
import type { EditorContext } from '../editors/types.js';
import type { Capability } from '../model/index.js';

/** A minimal EditorContext good enough for the pure HTML builder. */
function ctx(over: Partial<EditorContext> = {}): EditorContext {
  return {
    twist: { name: 'VIDEO MIXER', config: { name: 'Video Mixer', accepts: 'video', inputs: ['SW 1', 'SW 2'] } },
    sources: [{ id: 'a', label: 'CAM 1', color: '#fff' }, { id: 'b', label: 'CAM 3', color: '#fff' }],
    production: { name: 'PROD 7', color: '#5566EE' },
    siblings: [{ name: 'Video Mixer', config: null, sources: [] }],
    can: () => true,
    services: { openStageBox: () => {} },
    dispose: { add: () => {}, dispose: () => {} } as unknown as EditorContext['dispose'],
    ...over,
  };
}

describe('expectationHtml (Kind A)', () => {
  it('states the production, accepts + capacity, and routed feeds', () => {
    const { html } = expectationHtml(ctx(), { blurb: 'Broadcast switcher.' });
    expect(html).toContain('VIDEO MIXER');
    expect(html).toContain('Broadcast switcher.');
    expect(html).toContain('PROD 7');
    expect(html).toContain('video · up to 2 inputs');
    expect(html).toContain('2 feeds — CAM 1, CAM 3');
  });

  it('warns when nothing is routed yet', () => {
    const { html } = expectationHtml(ctx({ sources: [] }), {});
    expect(html).toContain('Nothing routed yet');
  });

  it('shows the floor when the room sits under one', () => {
    const { html } = expectationHtml(ctx({ production: { name: 'ROOM 2', color: '#3FC1C9', floor: '2ND FLOOR' } }), {});
    expect(html).toContain('ROOM 2 · 2ND FLOOR');
  });

  it('reports capability held vs view-only', () => {
    const caps: Capability[] = ['switch'];
    expect(expectationHtml(ctx({ can: () => true }), { requiredCaps: caps }).html).toContain('you hold it ✓');
    expect(expectationHtml(ctx({ can: () => false }), { requiredCaps: caps }).html).toContain('view-only ✗');
  });

  it('counts sibling twists of the same kind (excluding self)', () => {
    const sibs = [{ name: 'a', config: null, sources: [] }, { name: 'b', config: null, sources: [] }, { name: 'c', config: null, sources: [] }];
    expect(expectationHtml(ctx({ siblings: sibs }), {}).html).toContain('2 sibling twists');
  });

  it('renders the JSON-authored room tip (string form) and per-tool tip (object form)', () => {
    const c = ctx({
      production: { name: 'PROD 7', color: '#5566EE', tip: 'Secondary gallery.' },
      twist: { name: 'VIDEO MIXER', config: { name: 'Video Mixer', accepts: 'video', tip: { lead: '8-input switcher.', good: 'PGM before roll.' } } },
    });
    const { html } = expectationHtml(c, {});
    expect(html).toContain('Secondary gallery.');
    expect(html).toContain('8-input switcher.');
    expect(html).toContain('✓ PGM before roll.');
  });

  it('escapes HTML in authored + derived text', () => {
    const { html } = expectationHtml(ctx({ production: { name: 'A <b>& B', color: '#000' } }), {});
    expect(html).toContain('A &lt;b&gt;&amp; B');
    expect(html).not.toContain('A <b>& B');
  });

  it('camera-input twists read as "one camera"', () => {
    const c = ctx({ twist: { name: 'CAM 1', config: { name: 'CAM 1', accepts: 'camera', cameraInput: true, maxVideo: 1 } } });
    expect(expectationHtml(c, {}).html).toContain('one camera');
  });

  it('normTip accepts both the string and object forms', () => {
    expect(normTip('hi')).toEqual({ lead: 'hi' });
    expect(normTip({ lead: 'x', good: 'y' })).toEqual({ lead: 'x', good: 'y' });
  });
});
