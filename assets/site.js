/* Rosevari site v4. Shared behaviour for every page. No dependencies.
   apple-design: springs sampled into CSS linear() easing (s4); every animation starts from the live
   on-screen value so a second tap mid-flight reverses it smoothly (s3); reduced motion swaps
   movement for a short cross-fade (s14). */
(function(){
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  var canLinear = window.CSS && CSS.supports && CSS.supports('animation-timing-function','linear(0, 1)');

  /* Spring by damping ratio + response (seconds), sampled into a linear() easing. */
  function spring(damping, response){
    var w = 2*Math.PI/response, dt = 1/120, t = 0, pts = [], x;
    var wd = w*Math.sqrt(Math.max(0, 1-damping*damping));
    do{
      if(damping < 1){ x = 1-Math.exp(-damping*w*t)*(Math.cos(wd*t)+(damping*w/wd)*Math.sin(wd*t)); }
      else{ x = 1-Math.exp(-w*t)*(1+w*t); }
      pts.push(x); t += dt;
    }while((Math.abs(1-x) > 0.001 || t < response) && t < 2);
    pts[pts.length-1] = 1;
    var step = Math.max(1, Math.round(pts.length/60)), out = [];
    for(var i = 0; i < pts.length; i += step){ out.push(pts[i].toFixed(4)); }
    if(out[out.length-1] !== '1.0000'){ out.push('1'); }
    return {easing: canLinear ? 'linear('+out.join(',')+')' : 'cubic-bezier(.32,.72,0,1)', duration: Math.round(t*1000)};
  }

  /* ---------- Mobile menu sheet ---------- */
  (function(){
    var btn = document.querySelector('.menu-btn'), sheet = document.getElementById('sheet'), scrim = document.querySelector('.scrim');
    if(!btn || !sheet || !sheet.animate){ return; }
    var OPEN = spring(0.86, 0.36), CLOSE = spring(1, 0.28), anims = [], isOpen = false, lastFocus = null;

    function live(el){ /* the presentation value, never the target */
      var cs = getComputedStyle(el);
      return {opacity: cs.opacity, transform: cs.transform === 'none' ? 'none' : cs.transform};
    }
    function stop(){
      var a = live(sheet), b = live(scrim);
      anims.forEach(function(x){ x.cancel(); });
      anims = [];
      return {sheet: a, scrim: b};
    }
    function set(open, byKey){
      if(open === isOpen){ return; }
      isOpen = open;
      var from = sheet.style.visibility === 'visible' ? stop() : (stop(), null);
      document.documentElement.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      sheet.style.visibility = 'visible'; scrim.style.visibility = 'visible';
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      if(open){ lastFocus = document.activeElement; }

      var shut = 'translateY(-14px) scaleY(.96)';
      var sFrom = from ? from.sheet : {opacity: open ? 0 : 1, transform: open ? shut : 'none'};
      var cFrom = from ? from.scrim : {opacity: open ? 0 : 1};
      var finish = function(){
        if(!isOpen){ sheet.style.visibility = 'hidden'; scrim.style.visibility = 'hidden'; }
      };
      if(mq.matches){
        anims.push(sheet.animate([{opacity: sFrom.opacity}, {opacity: open ? 1 : 0}], {duration: 160, easing: 'ease-out', fill: 'forwards'}));
      }else{
        var cfg = open ? OPEN : CLOSE;
        anims.push(sheet.animate([sFrom, {opacity: open ? 1 : 0, transform: open ? 'none' : shut}], {duration: cfg.duration, easing: cfg.easing, fill: 'forwards'}));
      }
      anims.push(scrim.animate([cFrom, {opacity: open ? 1 : 0}], {duration: open ? 220 : 180, easing: 'ease-out', fill: 'forwards'}));
      anims[0].onfinish = finish;
      document.body.style.overflow = open ? 'hidden' : '';
      /* Move focus into the menu only for keyboard users; a tap keeps focus where it was. */
      if(open && byKey){ var first = sheet.querySelector('a'); if(first){ first.focus({preventScroll: true}); } }
      else if(!open && byKey && lastFocus && lastFocus.focus){ lastFocus.focus({preventScroll: true}); }
    }
    sheet.style.visibility = 'hidden'; scrim.style.visibility = 'hidden';
    btn.addEventListener('click', function(e){ set(!isOpen, e.detail === 0); });
    scrim.addEventListener('click', function(){ set(false); });
    document.addEventListener('keydown', function(e){
      if(!isOpen){ return; }
      if(e.key === 'Escape'){ set(false, true); btn.focus(); }
      if(e.key === 'Tab'){ /* keep focus inside the open menu */
        var f = [btn].concat([].slice.call(sheet.querySelectorAll('a')));
        var i = f.indexOf(document.activeElement);
        if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length-1].focus(); }
        else if(!e.shiftKey && i === f.length-1){ e.preventDefault(); f[0].focus(); }
      }
    });
    [].forEach.call(sheet.querySelectorAll('a'), function(a){ a.addEventListener('click', function(){ set(false); }); });
    var wide = window.matchMedia('(min-width: 821px)');
    var onWide = function(){ if(wide.matches){ set(false); } };
    if(wide.addEventListener){ wide.addEventListener('change', onWide); }
  })();

  /* ---------- The one orchestrated moment: twelve months marked paid, in order, once ---------- */
  (function(){
    var year = document.querySelector('.year');
    if(!year){ return; }
    var ms = [].slice.call(year.querySelectorAll('.m'));
    var run = function(){ ms.forEach(function(m, i){ setTimeout(function(){ m.classList.add('on'); }, 150 + i*90); }); };
    if(mq.matches || !('IntersectionObserver' in window)){ ms.forEach(function(m){ m.classList.add('on'); }); return; }
    var io = new IntersectionObserver(function(es){
      if(es.some(function(e){ return e.isIntersecting; })){ io.disconnect(); run(); }
    }, {threshold: 0.35});
    io.observe(year);
  })();

  /* ---------- Questions: a spring opens and closes each answer ---------- */
  (function(){
    var OPEN = spring(0.86, 0.42), CLOSE = spring(1, 0.32);
    [].forEach.call(document.querySelectorAll('details.q'), function(d){
      var s = d.querySelector('summary'), a = d.querySelector('.a'), inner = d.querySelector('.a-in'), anim = null, fade = null;
      if(location.hash && d.id && location.hash === '#'+d.id){ d.open = true; }
      if(d.open){ d.classList.add('is-open'); }
      s.setAttribute('aria-expanded', d.open ? 'true' : 'false');
      s.addEventListener('click', function(e){
        e.preventDefault();
        var opening = !d.classList.contains('is-open');
        var from = d.open ? a.getBoundingClientRect().height : 0;
        if(anim){ anim.cancel(); anim = null; }
        if(fade){ fade.cancel(); fade = null; }
        d.classList.toggle('is-open', opening);
        s.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if(opening){ d.open = true; }
        if(mq.matches || !a.animate){
          if(!opening){ d.open = false; return; }
          if(inner.animate){ inner.animate([{opacity: 0}, {opacity: 1}], {duration: 180, easing: 'ease-out'}); }
          return;
        }
        var to = opening ? a.scrollHeight : 0, cfg = opening ? OPEN : CLOSE;
        anim = a.animate([{height: from+'px'}, {height: to+'px'}], {duration: cfg.duration, easing: cfg.easing});
        fade = inner.animate(opening ? [{opacity: 0, transform: 'translateY(-6px)'}, {opacity: 1, transform: 'none'}] : [{opacity: 1}, {opacity: 0}],
                             {duration: opening ? 320 : 180, easing: 'ease-out', fill: 'both'});
        anim.onfinish = function(){
          anim = null;
          if(fade){ fade.cancel(); fade = null; }
          if(!opening){ d.open = false; }
        };
      });
    });
  })();

  /* ---------- Enquiry form: sends straight to Jordan's inbox via FormSubmit (formsubmit.co). Falls back to email app if the send fails. ---------- */
  (function(){
    var form = document.querySelector('form.enquiry');
    if(!form){ return; }
    var status = form.querySelector('.status');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var v = function(n){ var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };
      var name = form.elements.name, email = form.elements.email, phone = form.elements.phone;
      [name, email, phone].forEach(function(el){ el.removeAttribute('aria-invalid'); });
      status.className = 'status'; status.textContent = '';
      if(!v('name')){ name.setAttribute('aria-invalid', 'true'); name.focus(); status.className = 'status err'; status.textContent = 'Add your name so Jordan knows who to reply to.'; return; }
      if(!v('email') && !v('phone')){ email.setAttribute('aria-invalid', 'true'); phone.setAttribute('aria-invalid', 'true'); email.focus(); status.className = 'status err'; status.textContent = 'Add an email or a phone number so Jordan can reply.'; return; }
      if(v('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))){ email.setAttribute('aria-invalid', 'true'); email.focus(); status.className = 'status err'; status.textContent = 'That email address looks incomplete. Check it, or leave it empty and use your phone.'; return; }
      var role = (form.querySelector('input[name="role"]:checked') || {}).value || 'Not said';
      var lines = [
        'Name: ' + v('name'),
        'I am: ' + role,
        'Email: ' + (v('email') || 'not given'),
        'Phone: ' + (v('phone') || 'not given'),
        'Property or suburb: ' + (v('property') || 'not given'),
        '',
        v('message') || '(no message)'
      ];
      var subject = 'Website enquiry: ' + role + ', ' + v('name');
      var href = 'mailto:jordan@rosevari.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      if(form.elements._honey && form.elements._honey.value){ status.className = 'status ok'; status.textContent = 'Sent. Jordan will be in touch.'; form.reset(); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending...';
      status.className = 'status'; status.textContent = 'Sending your enquiry...';
      fetch('https://formsubmit.co/ajax/jordan@rosevari.com', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({
          _subject: subject, _template: 'table', _captcha: 'false', _replyto: v('email') || undefined,
          name: v('name'), role: role, email: v('email') || 'not given', phone: v('phone') || 'not given',
          property: v('property') || 'not given', message: v('message') || '(no message)'
        })
      }).then(function(r){ return r.json().then(function(d){ return {ok: r.ok, d: d}; }); })
      .then(function(res){
        if(!res.ok || String(res.d.success) !== 'true'){ throw new Error(res.d.message || 'send failed'); }
        status.className = 'status ok';
        status.textContent = 'Sent. Thanks ' + v('name').split(' ')[0] + ', Jordan will get back to you soon.';
        form.reset(); btn.textContent = 'Sent';
      }).catch(function(){
        status.className = 'status err';
        status.innerHTML = 'That did not send. Please <a href="' + href.replace(/"/g, '&quot;') + '">email jordan@rosevari.com</a> instead.';
        btn.disabled = false; btn.textContent = label;
      });
    });
  })();
})();
