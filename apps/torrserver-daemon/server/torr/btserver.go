package torr

import (
	"context"
	"fmt"
	"log"
	"maps"
	"net"
	"sync"

	"github.com/anacrolix/publicip"
	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/wlynxg/anet"

	"server/settings"
	"server/torr/storage/torrstor"
	"server/torr/utils"
	"server/version"
)

type BTServer struct {
	config   *torrent.ClientConfig
	client   *torrent.Client
	storage  *torrstor.Storage
	torrents map[metainfo.Hash]*Torrent
	mu       sync.Mutex
}

var privateIPBlocks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
		"169.254.0.0/16", "::1/128", "fe80::/10", "fc00::/7",
	} {
		_, block, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(fmt.Errorf("parse error on %q: %v", cidr, err))
		}
		privateIPBlocks = append(privateIPBlocks, block)
	}
}

func NewBTS() *BTServer {
	bts := new(BTServer)
	bts.torrents = make(map[metainfo.Hash]*Torrent)
	return bts
}

func (bt *BTServer) Connect() error {
	bt.mu.Lock()
	defer bt.mu.Unlock()
	var err error
	bt.configure(context.TODO())
	bt.client, err = torrent.NewClient(bt.config)
	bt.torrents = make(map[metainfo.Hash]*Torrent)
	// THE CALL TO InitApiHelper IS NOW GONE
	return err
}

func (bt *BTServer) Disconnect() {
	bt.mu.Lock()
	defer bt.mu.Unlock()
	if bt.client != nil {
		bt.client.Close()
		bt.client = nil
		utils.FreeOSMemGC()
	}
}

func (bt *BTServer) configure(ctx context.Context) {
	blocklist, _ := utils.ReadBlockedIP()
	bt.config = torrent.NewDefaultClientConfig()

	bt.storage = torrstor.NewStorage(settings.Get().CacheSize)
	bt.config.DefaultStorage = bt.storage

	userAgent := "qBittorrent/4.3.9"
	peerID := "-qB4390-"
	bt.config.PeerID = utils.PeerIDRandom(peerID)
	bt.config.UpnpID = "TorrServer/" + version.Version
	bt.config.HTTPUserAgent = userAgent
	bt.config.ExtendedHandshakeClientVersion = userAgent
	bt.config.Bep20 = peerID

	s := settings.Get()
	bt.config.Debug = s.EnableDebug
	bt.config.DisableIPv6 = !s.EnableIPv6
	bt.config.DisableTCP = s.DisableTCP
	bt.config.DisableUTP = s.DisableUTP
	bt.config.NoDefaultPortForwarding = s.DisableUPNP
	bt.config.NoDHT = s.DisableDHT
	bt.config.DisablePEX = s.DisablePEX
	bt.config.NoUpload = s.DisableUpload
	bt.config.IPBlocklist = blocklist
	bt.config.EstablishedConnsPerTorrent = s.ConnectionsLimit
	bt.config.TotalHalfOpenConns = 500
	bt.config.EncryptionPolicy = torrent.EncryptionPolicy{ForceEncryption: s.ForceEncrypt}

	if s.DownloadRateLimit > 0 {
		bt.config.DownloadRateLimiter = utils.Limit(s.DownloadRateLimit * 1024)
	}
	if s.UploadRateLimit > 0 {
		bt.config.UploadRateLimiter = utils.Limit(s.UploadRateLimit * 1024)
	}
	if s.PeersListenPort > 0 {
		bt.config.ListenPort = s.PeersListenPort
	}

	log.Println("Client config:", s)

	var err error
	bt.config.PublicIp4, err = publicip.Get4(ctx)
	if err != nil {
		log.Printf("error getting public ipv4 address: %v", err)
	}

	if s.EnableIPv6 {
		bt.config.PublicIp6, err = publicip.Get6(ctx)
		if err != nil {
			log.Printf("error getting public ipv6 address: %v", err)
		}
	}
}

func (bt *BTServer) GetTorrent(hash torrent.InfoHash) *Torrent {
	if torr, ok := bt.torrents[hash]; ok {
		return torr
	}
	return nil
}

func (bt *BTServer) ListTorrents() map[metainfo.Hash]*Torrent {
	list := make(map[metainfo.Hash]*Torrent)
	maps.Copy(list, bt.torrents)
	return list
}

func (bt *BTServer) RemoveTorrent(hash torrent.InfoHash) bool {
	if torr, ok := bt.torrents[hash]; ok {
		return torr.Close()
	}
	return false
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

func getPublicIp4() net.IP {
	ifaces, err := anet.Interfaces()
	if err != nil {
		log.Println("Error get public IPv4")
		return nil
	}
	for _, i := range ifaces {
		addrs, _ := anet.InterfaceAddrsByInterface(&i)
		if i.Flags&net.FlagUp == net.FlagUp {
			for _, addr := range addrs {
				var ip net.IP
				switch v := addr.(type) {
				case *net.IPNet:
					ip = v.IP
				case *net.IPAddr:
					ip = v.IP
				}
				if !isPrivateIP(ip) && ip.To4() != nil {
					return ip
				}
			}
		}
	}
	return nil
}

func getPublicIp6() net.IP {
	ifaces, err := anet.Interfaces()
	if err != nil {
		log.Println("Error get public IPv6")
		return nil
	}
	for _, i := range ifaces {
		addrs, _ := anet.InterfaceAddrsByInterface(&i)
		if i.Flags&net.FlagUp == net.FlagUp {
			for _, addr := range addrs {
				var ip net.IP
				switch v := addr.(type) {
				case *net.IPNet:
					ip = v.IP
				case *net.IPAddr:
					ip = v.IP
				}
				if !isPrivateIP(ip) && ip.To16() != nil && ip.To4() == nil {
					return ip
				}
			}
		}
	}
	return nil
}
