let debug_mode = true

const canvas = document.getElementById('canvas_game')
const ctx = canvas.getContext('2d')

const display =  {
  field: {
    scale: 25,
    x: 100,
    y: 80,

    draw: function() {
      this.draw_bg()

      for(j=0; j<20; ++j) {
        for(i=1; i<11; ++i) {
          const v = game.field.get(i, j)
          if(v > 64) {
            const kind = String.fromCharCode(v)
            display.draw_block(i, j, kind)
          }
        }
      }
    },

    draw_bg: function() {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      ctx.fillRect(0, 0, 12, 21)

      ctx.lineWidth = 0.01
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      for(i=1; i<11; ++i) {
        ctx.moveTo(i,  0)
        ctx.lineTo(i, 20)
      }
      for(j=1; j<20; ++j) {
        ctx.moveTo( 1, j)
        ctx.lineTo(11, j)
      }
      ctx.closePath()
      ctx.stroke()

      let lg = ctx.createLinearGradient(0, 0, 20, 20)
      lg.addColorStop(0, 'rgba(150,160,180,1)')
      lg.addColorStop(1, 'rgba(100,100,100,1)')

      ctx.fillStyle = lg
      ctx.fillRect( 0,  0,  1, 21)
      ctx.fillRect(11,  0,  1, 21)
      ctx.fillRect( 1, 20, 10,  1)
    }
  },

  nexts_box: {
    scale: 25,
    x: 440,
    y: 100,

    scale_first: 1,
    scale_other: 0.8,

    draw: function() {
      const sf = this.scale * this.scale_first

      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.scale(sf, sf)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.fillRect(0, 0, 5, 16)

      ctx.translate(0.5, 0.5)

      display.draw_mino(game.nexts[0], 0, 0)
      ctx.restore()

      let oy = 100
      const so = this.scale * this.scale_other

      for(const next of game.nexts.slice(1, 5)) {
        ctx.save()
        ctx.translate(this.x, this.y + oy)
        ctx.scale(so, so)
        ctx.translate(0.5, 0.5)
        display.draw_mino(next, 0, 0)
        ctx.restore()

        oy += 80
      }
    }
  },

  score: {
    x: 600,
    y: 100,

    draw: function() {
      ctx.save()

      ctx.translate(this.x, this.y)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.fillRect(0, 0, 150, 300)

      //ctx.font = '20px '

      ctx.fillStyle = 'rgb(255, 255, 255)'
      ctx.fillText(`${game.score.deleted}`, 15, 15)
      ctx.fillText(`${game.score.minos}`, 15, 45)

      ctx.restore()
    },
  },

  draw_block: function(x, y, kind, ctx_ = ctx) {
    ctx_.save()

    ctx_.translate(x, y)
    ctx_.fillStyle = minos[kind].style_outer
    ctx_.fillRect(0, 0, 1, 1)
    ctx_.fillStyle = minos[kind].style_inner
    ctx_.fillRect(0.1, 0.1, 0.8, 0.8)

    ctx_.restore()
  },

  draw_mino: function(mino = game.now, x = game.x, y = game.y) {
    const shape = minos[mino.kind].shapes[mino.rot]
    for(i=0; i<16; ++i) {
      if(shape[i] == '1') {
        const ox = i % 4
        const oy = Math.floor(i / 4)
        this.draw_block(x + ox, y + oy, mino.kind)
      }
    }
  },

  draw_debug: function() {
    ctx.save()
    ctx.resetTransform()

    ctx.textStyle = '10px'
    for(j=0; j<21; ++j) {
      for(i=0; i<12; ++i) {
        const block = game.field.get(i, j)
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.fillText(String(block),
          i*display.field.scale + display.field.x,
          j*display.field.scale + display.field.y + 11)
      }
    }

    ctx.restore()
  },

  draw_normal: function() {
    ctx.save()

    ctx.translate(this.field.x, this.field.y)
    ctx.scale(this.field.scale, this.field.scale)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    this.field.draw()

    this.draw_mino()

    if(debug_mode) {
      this.draw_debug()
    }

    ctx.restore()

    this.nexts_box.draw()

    this.score.draw()
  },

  draw_all: function() {
    this.draw_normal()


  },

  draw: function() {
    if(this.next_draw_type == 'normal') {
      this.draw_normal()
    } else if(this.next_draw_type == 'all_once') {
      this.draw_all()
      this.next_draw_type = 'normal'
    }
  },

  next_draw_type: 'normal',
  draw_all_next: function() {
    this.next_draw_type = 'all_once'
  }
}


function draw() {
  display.draw()
}




const game = {
  field: {
    data: new Int8Array(12*21),

    init: function() {
      for(j=0; j<21; ++j) {
        this.set( 0, j, 1)
        this.set(11, j, 1)
      }
      for(i=0; i<12; ++i) {
        this.set( i,20, 1)
      }
    },
    get: function(i, j) {
      return this.data[j*12 + i]
    },
    set: function(i, j, v) {
      this.data[j*12 + i] = v
    }
  },

  now: { kind: '', rot: 0 },
  ghost: { visible: false, kind: '', rot: 0, x: 0, y: 0 },
  status: 'dropping',
  x: 4,
  y: 0,
  vy: 0.4,
  vy_fastdrop: 0,
  quickdrop: false,
  ground_time: 10,
  ground_rest: this.ground_time,
  wait_time: 0,
  wait_rest: this.wait_time,
  delete_lines_time: 10,
  delete_lines_rest: this.delete_lines_rest,

  fastdrop_speed: 1,

  nexts: [],
  hold: null,

  inputs: {},

  lines_deleted: [],

  score: {
    deleted: 0,
    minos: 0,
  },

  init: function() {
    this.field.init()
    this.push_nexts()
    this.pop_mino()
  },

  update: function() {
    this.load_input()

    if(this.status == 'dropping') {
      this.move_by_input()

      for(let dy = this.quickdrop ? 20.0 : this.vy + this.vy_fastdrop; dy > 0.0; dy -= 1.0) {
        if(dy >= 1.0) {
          this.y += 1.0
        } else {
          this.y += dy
        }
        let grounding = this.is_ground()
        for(i=0; i<16; ++i) {
          if(minos[this.now.kind].shapes[this.now.rot][i] == '1') {
            const ox = i % 4
            const oy = Math.floor(i / 4)
            if(this.field.get(Math.floor(this.x)+ox, Math.floor(this.y)+oy+1) > 0) {
              grounding = true
              break
            }
          }
        }
        if(grounding) {
          this.x = Math.floor(this.x)
          this.y = Math.floor(this.y)
          this.ground_rest = this.ground_time
          this.status = 'grounding'
          break
        }
      }

    } else if(this.status == 'grounding') {
      if(this.quickdrop) {
        this.ground_rest = 0
      }
      if(this.ground_rest <= 0) {
        for(i=0; i<16; ++i) {
          if(minos[this.now.kind].shapes[this.now.rot][i] == '1') {
            const ox = i % 4
            const oy = Math.floor(i / 4)
            game.field.set(Math.floor(this.x)+ox, Math.floor(this.y)+oy, this.now.kind.charCodeAt(0))
          }
        }

        if(this.delete_lines()) {
          this.delete_lines_rest = this.delete_lines_time
          this.status = 'after_delete'
        } else {
          this.status = 'waiting'
          this.wait_rest = this.wait_time
        }

        this.score.minos += 1

        this.pop_mino()

        display.draw_all_next()

      } else {
        const moved = this.move_by_input()
        if(moved && !this.is_ground()) {
          this.status = 'dropping'
          this.ground_rest = this.ground_time
        } else {
          --this.ground_rest
        }
      }

    } else if(this.status == 'after_delete') {
      if(this.delete_lines_rest <= 0) {
        this.drop_lines()
        this.status = 'waiting'
        this.wait_rest = this.wait_time
      } else {
        --this.delete_lines_rest
      }

    } else if(this.status == 'waiting') {
      if(this.wait_rest <= 0) {
        this.status = 'dropping'
      } else {
        --this.wait_rest
      }
    }
  },

  is_crash: function() {
    for(i=0; i<16; ++i) {
      if(minos[this.now.kind].shapes[this.now.rot][i] == '1') {
        const ox = i % 4
        const oy = Math.floor(i / 4)
        if(this.field.get(Math.floor(this.x)+ox, Math.floor(this.y)+oy) > 0) {
          return true
        }
      }
    }
    return false
  },

  is_ground: function() {
    for(i=0; i<16; ++i) {
      if(minos[this.now.kind].shapes[this.now.rot][i] == '1') {
        const ox = i % 4
        const oy = Math.floor(i / 4)
        if(this.field.get(Math.floor(this.x)+ox, Math.floor(this.y)+oy+1) > 0) {
          return true
        }
      }
    }
    return false
  },

  move_by_input: function() {
    let moved = false

    if(inputs.left == 1 || inputs.left > 10) {
      this.x -= 1
      if(this.is_crash()) this.x += 1
      else moved = true
    }
    if(inputs.right == 1 || inputs.right > 10) {
      this.x += 1
      if(this.is_crash()) this.x -= 1
      else moved = true
    }
    if(inputs.down > 0 && this.status == 'dropping') {
      this.vy_fastdrop = this.fastdrop_speed
    } else {
      this.vy_fastdrop = 0
    }
    if(inputs.up == 1 && (this.status == 'dropping' || this.status == 'grounding')) {
      this.quickdrop = true
    } else {
      this.quickdrop = false
    }
    if(inputs.rot_l == 1) {
      this.now.rot = (this.now.rot + 1) % 4
      if(this.is_crash()) this.now.rot = (this.now.rot + 3) % 4
      else moved = true
    }
    if(inputs.rot_r == 1) {
      this.now.rot = (this.now.rot + 3) % 4
      if(this.is_crash()) this.now.rot = (this.now.rot + 1) % 4
      else moved = true
    }
    return moved
  },

  push_nexts: function() {
    const kinds = ['i', 't', 'o', 'j', 'l', 'z', 's']
    shuffle(kinds)
    for(const kind of kinds) {
      this.nexts.push({
        kind: kind,
        rot: 0
      })
    }
  },

  pop_mino: function() {
    this.now = this.nexts[0]
    this.nexts.shift()

    if(this.nexts.length <= 5) {
      this.push_nexts()
    }

    this.x = 4
    this.y = 0
  },

  load_input: function() {
    for(const key in inputs) {
      this.inputs[key] = inputs[key]
    }
  },

  delete_lines: function() {
    let n = 0
    for(let j=this.y; j<this.y+4 && j<20; ++j) {
      let filled = true
      for(let i=1; i<11; ++i) {
        if(game.field.get(i, j) == 0) {
          filled = false
          break
        }
      }
      if(filled) {
        for(let i=1; i<11; ++i) {
          game.field.set(i, j, 0)
        }
        this.lines_deleted.push(j)
        ++n
      }
    }
    this.score.deleted += n
    return n
  },

  drop_lines: function() {
    let ds = this.lines_deleted.reverse()
    let idx = 1
    let h = 1
    for(let j=ds[0]-1; j>0; --j) {
      if(ds[idx] == j) {
        ++h
        ++idx
      } else {
        for(let i=1; i<11; ++i) {
          game.field.set(i, j+h, game.field.get(i, j))
        }
      }
    }
    this.lines_deleted = []
  },

  update_ghost: function() {

  }
}

function random() {
  return Math.random()
}

function shuffle(a) {
  for(i=a.length-1; i>0; --i) {
    const r = Math.floor(random() * (i + 1))
    const tmp = a[i]
    a[i] = a[r]
    a[r] = tmp
  }
}

const mino_strings = {
  i: [
    '0000111100000000',
    '0100010001000100',
    '0000000011110000',
    '0010001000100010'
  ],
  t: [
    '0100111000000000',
    '0100110001000000',
    '0000111001000000',
    '0100011001000000'
  ],
  o: [
    '0110011000000000',
    '0110011000000000',
    '0110011000000000',
    '0110011000000000'
  ],
  j: [
    '1000111000000000',
    '0100010011000000',
    '0000111000100000',
    '0110010001000000'
  ],
  l: [
    '0010111000000000',
    '0110001000100000',
    '0000111010000000',
    '0100010001100000'
  ],
  z: [
    '1100011000000000',
    '0100110010000000',
    '0000110001100000',
    '0010011001000000'
  ],
  s: [
    '0110110000000000',
    '0100011000100000',
    '0000011011000000',
    '1000110001000000'
  ]
}

const mino_shifts = {
  i: [
    [-1, 0], [2, 0], [-1, -2], [2, 1]
  ],
  other: [
    [1, 0], [1, -1], [0, 2], [1, 2]
  ]
}

const block_colors = {
  i: {
    outer1: 'rgb(0, 200, 200)',
    outer2: 'rgb(0, 100, 100)',
    inner1: 'rgb(0, 155, 155)',
    inner2: 'rgb(0, 255, 255)'
  },
  t: {
    outer1: 'rgb(155, 0, 155)',
    outer2: 'rgb(100, 0, 100)',
    inner1: 'rgb(155, 0, 155)',
    inner2: 'rgb(255, 0, 255)'
  },
  o: {
    outer1: 'rgb(155, 155, 0)',
    outer2: 'rgb(100, 100, 0)',
    inner1: 'rgb(155, 155, 0)',
    inner2: 'rgb(255, 255, 0)'
  },
  j: {
    outer1: 'rgb(0, 0, 155)',
    outer2: 'rgb(0, 0, 100)',
    inner1: 'rgb(0, 0, 155)',
    inner2: 'rgb(0, 0, 255)'
  },
  l: {
    outer1: 'rgb(155,  80, 0)',
    outer2: 'rgb(100,  50, 0)',
    inner1: 'rgb(155,  80, 0)',
    inner2: 'rgb(255, 120, 0)'
  },
  z: {
    outer1: 'rgb(155,   0, 0)',
    outer2: 'rgb(100,   0, 0)',
    inner1: 'rgb(155,   0, 0)',
    inner2: 'rgb(255,   0, 0)'
  },
  s: {
    outer1: 'rgb(0, 155, 0)',
    outer2: 'rgb(0, 100, 0)',
    inner1: 'rgb(0, 155, 0)',
    inner2: 'rgb(0, 255, 0)'
  },
}

function mino_compile(ss, cols) {
  const res = {}
  for(kind in ss) {
    const c = {
      shapes: ss[kind]
    }



    const mc = cols[kind]

    const olg = ctx.createLinearGradient(0, 0, 1, 1)
    olg.addColorStop(0, mc.outer1)
    olg.addColorStop(1, mc.outer2)
    c.style_outer = olg

    const ilg = ctx.createLinearGradient(0.2, 0.2, 0.8, 0.8)
    ilg.addColorStop(0, mc.inner1)
    ilg.addColorStop(1, mc.inner2)
    c.style_inner = ilg

    res[kind] = c
  }

  return res
}

const minos = mino_compile(mino_strings, block_colors)



function init() {
  game.init()
  display.draw_all()
}

function update() {
  update_inputs()
  game.update()
  display.draw()

  document.getElementById('game_console').textContent = JSON.stringify(game)
}


init()

game.now.kind = 't'

setInterval(update, 1000/30)

let inputs = {
  up: 0,
  down: 0,
  left: 0,
  right: 0,
  rot_l: 0,
  rot_r: 0
}

let keydowns = {
  up: false,
  down: false,
  left: false,
  right: false,
  rot_l: false,
  rot_r: false
}

window.addEventListener('keydown', function(e) {
  if(e.key == 'w') keydowns.up    = true
  if(e.key == 's') keydowns.down  = true
  if(e.key == 'a') keydowns.left  = true
  if(e.key == 'd') keydowns.right = true
  if(e.key == 'j') keydowns.rot_l = true
  if(e.key == 'k') keydowns.rot_r = true
})

window.addEventListener('keyup', function(e) {
  if(e.key == 'w') keydowns.up    = false
  if(e.key == 's') keydowns.down  = false
  if(e.key == 'a') keydowns.left  = false
  if(e.key == 'd') keydowns.right = false
  if(e.key == 'j') keydowns.rot_l = false
  if(e.key == 'k') keydowns.rot_r = false
})

function update_inputs() {
  for(const key in keydowns) {
    if(keydowns[key] == true) {
      ++inputs[key]
    } else {
      inputs[key] = 0
    }
  }
}
