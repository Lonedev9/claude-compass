export interface ISidebarNavItem {
  key: string;
  label: string;
  url: string;
  iconName?: string;
}

export interface ISidebarSPProps {
  items: ISidebarNavItem[];
  activeKey?: string;
}
