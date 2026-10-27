const nav=document.querySelector('header nav');const aboutButton=document.querySelector('#aboutOpen');const aboutDialog=document.querySelector('#about');let previousActive;
function markActive(el){nav.querySelectorAll('a,button').forEach(item=>{item.classList.toggle('active',item===el);if(item===el&&item.tagName==='A')item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')})}
function syncNavigation(){const links=[...nav.querySelectorAll('a')];const isHome=!!document.querySelector('#home');markActive(isHome?links.find(a=>location.hash==='#projects'?a.hash==='#projects':a.hash==='#home'):links.find(a=>a.hash==='#projects'))}
if(!document.querySelector('#art')){aboutButton.addEventListener('click',()=>aboutDialog.showModal());aboutDialog.querySelector('.close').addEventListener('click',()=>aboutDialog.close());aboutDialog.addEventListener('click',e=>{if(e.target===aboutDialog){const b=aboutDialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)aboutDialog.close()}})}
aboutButton.addEventListener('click',()=>{previousActive=nav.querySelector('.active');markActive(aboutButton)});aboutDialog.addEventListener('close',()=>{if(previousActive)markActive(previousActive);else syncNavigation()});window.addEventListener('hashchange',syncNavigation);syncNavigation();

// Follow the proposal section at the top of the reading area.
const proposalLinks = [...document.querySelectorAll('.proposal-nav a[href^="#"]')];
if (proposalLinks.length) {
  const sections = proposalLinks.map(link => document.getElementById(link.hash.slice(1)));
  let scheduled = false;
  function updateProposalNavigation() {
    scheduled = false;
    const readingLine = Math.min(160, window.innerHeight * 0.22);
    let active = 0;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= readingLine) active = index;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = sections.length - 1;
    proposalLinks.forEach((link, index) => {
      link.classList.toggle('section-active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleProposalNavigation() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProposalNavigation); }
  }
  window.addEventListener('scroll', scheduleProposalNavigation, { passive: true });
  window.addEventListener('resize', scheduleProposalNavigation);
  window.addEventListener('hashchange', scheduleProposalNavigation);
  window.addEventListener('load', scheduleProposalNavigation);
  updateProposalNavigation();
}
