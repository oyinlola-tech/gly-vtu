import svgPaths from "./svg-ff7h4i2dm6";

function Notch() {
  return (
    <div className="-translate-x-1/2 absolute h-[30px] left-1/2 top-[-2px] w-[219px]" data-name="Notch">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 219 30">
        <g id="Notch">
          <path d={svgPaths.p7f98200} fill="var(--fill-0, black)" id="Notch_2" />
        </g>
      </svg>
    </div>
  );
}

function RightSide() {
  return (
    <div className="absolute h-[11.336px] right-[14.67px] top-[17.33px] w-[66.661px]" data-name="Right Side">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 66.6612 11.3359">
        <g id="Right Side">
          <g id="Battery">
            <path d={svgPaths.p2bcf2900} id="Rectangle" opacity="0.35" stroke="var(--stroke-0, white)" />
            <path d={svgPaths.p32eac000} fill="var(--fill-0, white)" id="Combined Shape" opacity="0.4" />
            <path d={svgPaths.pb5036c0} fill="var(--fill-0, white)" id="Rectangle_2" />
          </g>
          <path clipRule="evenodd" d={svgPaths.p1d7c8600} fill="var(--fill-0, white)" fillRule="evenodd" id="Wifi" />
          <path clipRule="evenodd" d={svgPaths.p3e2de00} fill="var(--fill-0, white)" fillRule="evenodd" id="Mobile Signal" />
        </g>
      </svg>
    </div>
  );
}

function LeftSide() {
  return (
    <div className="absolute contents left-[21px] top-[12px]" data-name="Left Side">
      <div className="absolute h-[21px] left-[21px] rounded-[24px] top-[12px] w-[54px]" data-name="_StatusBar-time">
        <p className="-translate-x-1/2 absolute font-['SF_Pro_Text:Semibold',sans-serif] h-[20px] leading-[20px] left-[27px] not-italic text-[15px] text-center text-white top-px tracking-[-0.5px] w-[54px]">9:41</p>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="-translate-x-1/2 absolute bg-gradient-to-l from-[#235697] from-[1.194%] h-[260px] left-1/2 to-[#114280] top-0 w-[375px]">
      <div className="absolute h-[44px] left-0 overflow-clip top-0 w-[375px]" data-name="StatusBar / iPhone X (or newer)">
        <Notch />
        <RightSide />
        <LeftSide />
      </div>
    </div>
  );
}

function X() {
  return (
    <div className="-translate-y-1/2 absolute left-[20px] size-[20px] top-[calc(50%+0.5px)]" data-name="X">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="X">
          <path d={svgPaths.p37eebf80} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute border-[#f3f3f3] border-b border-solid h-[50px] left-0 overflow-clip top-0 w-[375px]">
      <X />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] ml-[0.65px] mt-0 not-italic relative row-1 text-[#7d7c93] text-[12.941px] tracking-[-0.2588px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.47px] relative row-1 w-[10.5px]">
        <div className="absolute inset-[-1.29px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 1.29412">
            <line id="Line 3" stroke="var(--stroke-0, #7D7C93)" strokeWidth="1.29412" x2="10.5" y1="0.647059" y2="0.647059" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.06px] relative row-1 w-[10.5px]">
        <div className="absolute inset-[-1.29px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 1.29412">
            <line id="Line 4" stroke="var(--stroke-0, #7D7C93)" strokeWidth="1.29412" x2="10.5" y1="0.647059" y2="0.647059" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-end relative shrink-0">
      <Group />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[13px] text-center tracking-[-0.26px] whitespace-nowrap">10,000.00</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[13px] tracking-[-0.26px] whitespace-nowrap">You have successfully transferred</p>
      <Frame1 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex flex-col gap-[2px] items-center left-1/2 top-[182px]">
      <Frame6 />
      <p className="bg-clip-text bg-gradient-to-l font-['Basis_Grotesque_Pro:Regular',sans-serif] from-[#235697] from-[1.194%] leading-[1.2] not-italic relative shrink-0 text-[13px] text-[transparent] to-[#114280] tracking-[-0.26px] whitespace-nowrap">{`Bank Name: eNaira `}</p>
      <p className="bg-clip-text bg-gradient-to-l font-['Basis_Grotesque_Pro:Regular',sans-serif] from-[#235697] from-[1.194%] leading-[1.2] not-italic relative shrink-0 text-[13px] text-[transparent] to-[#114280] tracking-[-0.26px] whitespace-nowrap">@adetor.1g</p>
    </div>
  );
}

function Export() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Export">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Export">
          <path d={svgPaths.p3d9be100} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-x-1/2 absolute bg-gradient-to-l content-stretch flex from-[#235697] from-[1.194%] gap-[10px] h-[53px] items-center justify-center left-1/2 overflow-clip px-[128px] py-[16px] rounded-[8px] to-[#114280] top-[274px] w-[335px]">
      <Export />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.4] not-italic relative shrink-0 text-[15px] text-center text-white tracking-[-0.3px] whitespace-nowrap">Share receipt</p>
    </div>
  );
}

function DownloadSimple() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="DownloadSimple">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="DownloadSimple">
          <path d={svgPaths.p222fca80} fill="url(#paint0_linear_1_6665)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6665" x1="15.5888" x2="2.25" y1="2.25" y2="2.25">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[53px] left-1/2 rounded-[8px] top-[339px] w-[335px]">
      <div className="content-stretch flex gap-[10px] items-center justify-center overflow-clip px-[128px] py-[16px] relative rounded-[inherit] size-full">
        <DownloadSimple />
        <p className="bg-clip-text bg-gradient-to-l font-['Basis_Grotesque_Pro:Medium',sans-serif] from-[#235697] from-[1.194%] leading-[1.4] not-italic relative shrink-0 text-[15px] text-[transparent] text-center to-[#114280] tracking-[-0.3px] whitespace-nowrap">Download receipt</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#235697] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[80px] top-1/2" data-name="CheckCircle">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 80">
        <g id="CheckCircle">
          <path d={svgPaths.p1a573500} fill="var(--fill-0, #0D8536)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame9() {
  return (
    <div className="-translate-x-1/2 absolute bg-[rgba(13,133,54,0.1)] left-1/2 overflow-clip rounded-[500px] size-[110px] top-[24px]">
      <CheckCircle />
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute h-[650px] left-0 overflow-clip top-[50px] w-[375px]">
      <p className="absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.2] left-[calc(50%-89px)] not-italic text-[#3b3d4b] text-[20px] top-[146px] tracking-[-0.4px] whitespace-nowrap">Transfer successful!</p>
      <Frame7 />
      <Frame />
      <Frame8 />
      <Frame9 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-x-1/2 absolute bg-white bottom-0 h-[744px] left-1/2 overflow-clip rounded-tl-[16px] rounded-tr-[16px] w-[375px]">
      <div className="absolute bottom-0 h-[34px] left-0 w-[375px]" data-name="Home Indicator">
        <div className="-translate-x-1/2 absolute bg-black bottom-[8px] h-[5px] left-[calc(50%+0.5px)] rounded-[100px] w-[134px]" data-name="Home Indicator" />
      </div>
      <Frame4 />
      <Frame5 />
    </div>
  );
}

export default function SendMoneyENairaAccount() {
  return (
    <div className="bg-white relative size-full" data-name="Send Money - eNaira Account 10">
      <Frame3 />
      <Frame2 />
    </div>
  );
}