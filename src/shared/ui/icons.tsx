import {
  ArrowLeftIcon as PhosphorArrowLeftIcon,
  ArrowRightIcon as PhosphorArrowRightIcon,
  BagSimpleIcon,
  CaretDownIcon,
  CheckIcon as PhosphorCheckIcon,
  InstagramLogoIcon,
  ListIcon,
  MinusIcon as PhosphorMinusIcon,
  PauseIcon as PhosphorPauseIcon,
  PlayIcon as PhosphorPlayIcon,
  PlusIcon as PhosphorPlusIcon,
  UserIcon as PhosphorUserIcon,
  WhatsappLogoIcon,
  XIcon,
  type Icon as PhosphorIcon,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react';

type IconProps = Omit<PhosphorIconProps, 'size'> & {
  size?: number;
};

function Icon({
  icon: Component,
  size = 20,
  weight = 'regular',
  ...props
}: IconProps & { icon: PhosphorIcon }) {
  return <Component size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export const BagIcon = (props: IconProps) => <Icon icon={BagSimpleIcon} {...props} />;
export const UserIcon = (props: IconProps) => <Icon icon={PhosphorUserIcon} {...props} />;
export const CheckIcon = (props: IconProps) => <Icon icon={PhosphorCheckIcon} {...props} />;
export const MenuIcon = (props: IconProps) => <Icon icon={ListIcon} {...props} />;
export const CloseIcon = (props: IconProps) => <Icon icon={XIcon} {...props} />;
export const PlusIcon = (props: IconProps) => <Icon icon={PhosphorPlusIcon} {...props} />;
export const MinusIcon = (props: IconProps) => <Icon icon={PhosphorMinusIcon} {...props} />;
export const ArrowRightIcon = (props: IconProps) => <Icon icon={PhosphorArrowRightIcon} {...props} />;
export const ArrowLeftIcon = (props: IconProps) => <Icon icon={PhosphorArrowLeftIcon} {...props} />;
export const ChevronDownIcon = (props: IconProps) => <Icon icon={CaretDownIcon} {...props} />;
export const InstagramIcon = (props: IconProps) => <Icon icon={InstagramLogoIcon} {...props} />;
export const WhatsAppIcon = (props: IconProps) => <Icon icon={WhatsappLogoIcon} {...props} />;
export const PauseIcon = (props: IconProps) => <Icon icon={PhosphorPauseIcon} {...props} />;
export const PlayIcon = (props: IconProps) => <Icon icon={PhosphorPlayIcon} {...props} />;
