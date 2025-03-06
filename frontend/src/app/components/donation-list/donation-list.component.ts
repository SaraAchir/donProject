import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { DonationApiService } from '../../services/donation-api.service';
import { MatDialog } from '@angular/material/dialog';
import { DonationDetailComponent } from '../donation-detail/donation-detail.component';

@Component({
  selector: 'app-donation-list',
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.scss'],
  standalone:false
})
export class DonationListComponent implements OnInit {
  displayedColumns: string[] = ['created_at', 'total_amount', 'payment_method', 'payment_status'];  dataSource = new MatTableDataSource<any>([]); 
  loading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;  // Add ! operator
  @ViewChild(MatSort) sort!: MatSort;  // Add ! operator

  constructor(private donationService: DonationApiService,private dialog: MatDialog) {}

  ngOnInit() {
    this.loadDonations();
  }
  openDonationDetails(donation: any) {
    this.dialog.open(DonationDetailComponent, {
      width: '500px',
      data: donation
    });
  }
  loadDonations() {
    this.donationService.getUserDonations().subscribe({
      next: (data) => {
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading donations:', error);
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}