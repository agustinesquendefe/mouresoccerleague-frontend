import Link from "next/link";
import { styled } from "@mui/material";
import Image from "next/image";

const LinkStyled = styled(Link)(() => ({
  height: "100%",
  width: "180px",
  overflow: "hidden",
  display: "block",
}));

const Logo = () => {
  return (
    <LinkStyled href="/">
      <Image src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg" alt="logo" height={100} width={174} priority />
    </LinkStyled>
  );
};

export default Logo;
  