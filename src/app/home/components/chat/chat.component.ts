/* eslint-disable space-before-function-paren */
import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {SerPort} from '../../../shared/data/ser-port';
import {ElectronService} from '../../../core/services';
import {LoraSetting} from '../../../shared/data/lora-setting';
import * as SerialPort from 'serialport';
import {ChatItem} from '../../../shared/data/chat-item';
import {ATStatus} from '../../enums/atstatus';
import {RawData} from '../../../shared/data/raw-data';
import * as lodash from 'lodash';
import {PackageService} from '../../../shared/services/package.service';
import {MSG} from '../../../shared/data/header/msg';
import {ACK} from '../../../shared/data/header/ack';
import {RERR} from '../../../shared/data/header/rerr';
import {RREQ} from '../../../shared/data/header/rreq';
import {RREP} from '../../../shared/data/header/rrep';
import {WaitForRoute} from '../../../shared/data/wait-for-route';
import {
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import {Package} from '../../../shared/data/header/package';
import {RerrPath} from "../../../shared/data/header/rerr-path";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  ports: SerPort[];
  lodash = lodash;
  rawData: RawData[];
  inputString: string;
  inputStringRaw: string;
  selectedPortId: string;
  content: string;
  connected: string;
  selectedPort: SerPort;
  loraSetting: LoraSetting;
  serialPort: SerialPort;
  parser: SerialPort.parsers.Delimiter;
  packageToSend: MSG;
  ackAttempts = 0;
  routeAttempts = 0;
  waitForRoute: WaitForRoute[];
  routeToFind: RREQ;
  sentMSGGs: string[];
  messageToSend: string;
  faTrashAlt = faTrashAlt;

  // TESTS
  ack = new ACK();
  rreq = new RREQ();
  rrep = new RREP();
  msg = new MSG();
  rerr = new RERR();
  rerrPath = new RerrPath();

  constructor(private electron: ElectronService, private changeDetection: ChangeDetectorRef) {
    this.loraSetting = new LoraSetting(93, 'CFG=434920000,5,6,12,4,1,0,0,0,0,3000,8,8', 115200);
    this.connected = 'NOT_CONNECTED';
    this.rawData = [];
    this.waitForRoute = [];
    this.sentMSGGs = [];
    this.inputStringRaw = '';
    this.messageToSend = '';
    this.rerr.paths = [];
    this.rerr.pathCount = 1;
    this.rerr.paths.push(this.rerrPath);

  }

  ngOnInit(): void {
    this.getAllPorts();
  }

  connectToPort() {
    this.connected = 'CONNECTING';
    this.serialPort = new this.electron.serialPort(this.selectedPort.path, {baudRate: Number(this.loraSetting.baudRate)});
    this.parser = this.serialPort.pipe(new this.electron.serialPort.parsers.Readline({delimiter: '\r\n'}));

    this.serialPort.on('open', () => {
      this.connected = 'CONNECTED';
    });
    this.serialPort.on('error', (err) => {
      this.connected = 'NOT_CONNECTED';
    });

    this.parser.on('data', data => {
      if (data && data.toString().trim() !== '') {
        this.rawData.push(new RawData(data.toString().trim(), false));
        this.changeDetection.detectChanges();
        this.handleReceivedData(data.toString().trim());
      }
    });
  }

  sendTestPackage(pkg: Package) {
    this.serialWriteMessage('LR,0123,' + pkg.toBase64String().length + ',' + pkg.toBase64String());
  }

  closePort() {
    this.serialPort.close();
    this.connected = 'NOT_CONNECTED';
    this.rawData = [];
    this.inputStringRaw = '';
    this.messageToSend = '';
    this.loraSetting.addressIsSet = false;
    this.loraSetting.configIsSet = false;
    this.loraSetting.broadcastIsSet = false;
  }

  getAllPorts() {
    if (this.connected === 'CONNECTED') {
      this.closePort();
    }
    this.ports = null;
    this.selectedPort = null;
    this.selectedPortId = '';
    this.electron.serialPort.list().then((ports: SerPort[]) => {
      this.ports = ports;
    }).catch((err: any) => {
      console.log(err);
      this.connected = 'NOT_CONNECTED';
    });
  }

  selectPort(selectedPortID: string) {
    console.log(selectedPortID);
    this.selectedPort = this.ports.find(p => p.path === selectedPortID);
  }

  sendRawMessage() {
    if (this.inputStringRaw && this.inputStringRaw.trim().length > 0) {
      this.serialWriteMessage(this.inputStringRaw);
      this.inputStringRaw = '';
    }
  }

  handleReceivedData(data: string) {
    if (data && data.length > 0) {
      if (data.toUpperCase().includes('AT+ADDR')) {
        this.serialWriteMessage('AT,OK');
      } else if (data.toUpperCase().includes('AT+CFG=')) {
        this.serialWriteMessage('AT,OK');
      } else if (data.toUpperCase().includes('AT+DEST')) {
        this.serialWriteMessage('AT,OK');
      } else if (data.toUpperCase().includes('AT+SEND=')) {
        this.serialWriteMessage('AT,OK');
      } else if (data.toUpperCase().includes('AT')) {
        this.serialWriteMessage('AT,OK');
      } else {
        // Packages
        this.serialWriteMessage('AT,SENDING');
        setTimeout(() => {
          this.serialWriteMessage('AT,SENDED');
        }, 1500);
      }

    }
    this.changeDetection.detectChanges();
  }

  serialWriteMessage(text: string) {
    text = text.trim() + '\r\n';
    const self = this;
    this.rawData.push(new RawData(text, true));
    this.changeDetection.detectChanges();
    setTimeout(() => {
      // @ts-ignore
      this.serialPort.write(text, function (err) {
      });
    }, 800);
  }

}
